import { act, screen, userEvent } from '@testing-library/react-native';

import ShareScreen from '../../src/app/share';
import { fetchSharedPlaces, onBluetoothStateChange, scanForNearbyUsers, type NearbyUser } from '../../src/ble/client';
import { requestBluetoothPermissions } from '../../src/ble/permissions';
import { decodeInfo, decodeItem } from '../../src/ble/protocol';
import { listPlaces } from '../../src/db/locations';
import { emitNative, nativeMock } from '../helpers/nativeModuleMock';
import { activeKeepAwakeTags } from '../helpers/keepAwakeMock';
import { mockAlert, place, renderApp } from '../helpers/renderApp';

jest.mock('../../src/ble/permissions', () => ({ requestBluetoothPermissions: jest.fn(async () => true) }));
jest.mock('../../src/ble/client', () => ({
  onBluetoothStateChange: jest.fn(),
  scanForNearbyUsers: jest.fn(),
  fetchSharedPlaces: jest.fn(),
}));

let setBtState: (s: string) => void;
let scan: { onUser: (u: NearbyUser) => void; onError: (m: string) => void; stop: jest.Mock };

beforeEach(() => {
  jest.mocked(requestBluetoothPermissions).mockResolvedValue(true);
  jest.mocked(onBluetoothStateChange).mockImplementation((listener) => {
    setBtState = listener;
    listener('PoweredOn');
    return { remove: jest.fn() };
  });
  jest.mocked(scanForNearbyUsers).mockImplementation((onUser, onError) => {
    scan = { onUser, onError, stop: jest.fn() };
    return scan.stop;
  });
});

const user = (id: string, name: string, rssi: number | null, lastSeen = Date.now()) => ({ id, name, rssi, lastSeen });

describe('sharing my places', () => {
  it('shares the selected places and shows connected phones', async () => {
    const u = userEvent.setup();
    await renderApp(<ShareScreen />, {
      places: [place('Oak'), place('Elm')],
      settings: { displayName: 'Gerald', units: 'metric', highAccuracyGps: true, searchAreaDistanceM: 50, findMode: 'once' as const, hideFound: false },
    });
    expect(screen.getByText(/see you as “Gerald”/)).toBeOnTheScreen();
    await u.press(screen.getByRole('checkbox', { name: /Elm/ }));
    await u.press(screen.getByRole('button', { name: 'Share 1 place' }));
    const [name, info, items] = nativeMock.startSharing.mock.calls[0];
    expect(name).toBe('Gerald');
    expect(decodeInfo(info).count).toBe(1);
    expect(decodeItem(items[0]).name).toBe('Oak');
    expect(screen.getByText('Sharing — keep this screen open.')).toBeOnTheScreen();

    // While sharing the selection is locked.
    await u.press(screen.getByRole('checkbox', { name: /Elm/ }));
    expect(screen.getByRole('checkbox', { name: /Elm/ })).not.toBeChecked();

    await act(async () => emitNative('onSharePeer', { address: 'A', state: 'connected' }));
    await act(async () => emitNative('onSharePeer', { address: 'B', state: 'connected' }));
    await act(async () => emitNative('onSharePeer', { address: 'A', state: 'disconnected' }));
    expect(screen.getByText('Sharing — keep this screen open. 1 connected now.')).toBeOnTheScreen();

    nativeMock.stopSharing.mockRejectedValueOnce(new Error('ignored'));
    await u.press(screen.getByRole('button', { name: 'Stop sharing' }));
    expect(screen.getByRole('button', { name: 'Share 1 place' })).toBeOnTheScreen();
    await act(async () => emitNative('onSharePeer', { address: 'B', state: 'disconnected' }));
  });

  it('needs permission, reports failures, and stops sharing when leaving', async () => {
    const u = userEvent.setup();
    const alert = mockAlert();
    await renderApp(<ShareScreen />, { places: [place('Oak')] });
    expect(screen.getByRole('button', { name: 'Share 1 place' })).toBeEnabled();

    jest.mocked(requestBluetoothPermissions).mockResolvedValueOnce(false);
    await u.press(screen.getByRole('button', { name: 'Share 1 place' }));
    expect(alert.message('Bluetooth permission needed')).toMatch(/share/);

    nativeMock.startSharing.mockRejectedValueOnce(new Error('No advertising')).mockRejectedValueOnce('odd');
    await u.press(screen.getByRole('button', { name: 'Share 1 place' }));
    expect(alert.message('Could not start sharing')).toBe('No advertising');
    await u.press(screen.getByRole('button', { name: 'Share 1 place' }));
    expect(alert.message('Could not start sharing')).toBe('odd');

    await u.press(screen.getByRole('checkbox', { name: /Oak/ }));
    expect(screen.getByRole('button', { name: 'Share 0 places' })).toBeDisabled();
    await screen.unmount();
    expect(nativeMock.stopSharing).toHaveBeenCalled();
  });

  it('shows Bluetooth problems and an empty list', async () => {
    await renderApp(<ShareScreen />);
    expect(screen.getByText('You have no places to share yet.')).toBeOnTheScreen();
    await act(async () => setBtState('PoweredOff'));
    expect(screen.getByText(/Bluetooth is off/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Look for nearby FindIt users' })).toBeDisabled();
    await act(async () => setBtState('Unauthorized'));
    expect(screen.getByText('Bluetooth: Unauthorized')).toBeOnTheScreen();
  });
});

describe('keeping the screen awake', () => {
  it('only while sharing, looking or downloading', async () => {
    const u = userEvent.setup();
    await renderApp(<ShareScreen />, { places: [place('Oak')] });
    expect(activeKeepAwakeTags()).toEqual([]);

    await u.press(screen.getByRole('button', { name: 'Share 1 place' }));
    expect(activeKeepAwakeTags()).toEqual(['share']);
    await u.press(screen.getByRole('button', { name: 'Stop sharing' }));
    expect(activeKeepAwakeTags()).toEqual([]);

    await u.press(screen.getByRole('button', { name: 'Look for nearby FindIt users' }));
    expect(activeKeepAwakeTags()).toEqual(['share']);
    await act(async () => scan.onUser(user('d1', 'Alex', -50)));
    let finish!: (v: Awaited<ReturnType<typeof fetchSharedPlaces>>) => void;
    jest.mocked(fetchSharedPlaces).mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    await u.press(screen.getByText('Alex'));
    expect(activeKeepAwakeTags()).toEqual(['share']); // downloading (scan stopped)
    await act(async () => finish({ from: 'Alex', places: [] }));
    expect(activeKeepAwakeTags()).toEqual([]);
  });
});

describe('receiving', () => {
  it('finds nearby users, downloads and imports their places', async () => {
    const u = userEvent.setup();
    const alert = mockAlert();
    const db = await renderApp(<ShareScreen />, { places: [place('Oak')] });

    await u.press(screen.getByRole('button', { name: 'Look for nearby FindIt users' }));
    expect(screen.getByText(/Looking…/)).toBeOnTheScreen();
    await act(async () => {
      scan.onUser(user('d1', 'Alex', -50));
      scan.onUser(user('d2', 'Sam', -70));
      scan.onUser(user('d3', 'Jo', -90));
      scan.onUser(user('d4', 'Pat', null));
    });
    expect(screen.getByText('very close · tap to download')).toBeOnTheScreen();
    expect(screen.getByText('close · tap to download')).toBeOnTheScreen();
    expect(screen.getByText('farther away · tap to download')).toBeOnTheScreen();
    expect(screen.getByText(' · tap to download')).toBeOnTheScreen();

    let finish!: (v: Awaited<ReturnType<typeof fetchSharedPlaces>>) => void;
    jest.mocked(fetchSharedPlaces).mockImplementationOnce(
      (_id, onProgress) =>
        new Promise((resolve) => {
          finish = resolve;
          onProgress?.(0, 0);
        }),
    );
    await u.press(screen.getByText('Alex'));
    expect(scan.stop).toHaveBeenCalled();
    expect(screen.getByText('Connecting…')).toBeOnTheScreen();
    const progress = jest.mocked(fetchSharedPlaces).mock.calls[0][1]!;
    await act(async () => progress(1, 2));
    expect(screen.getByText('Downloading 1 of 2…')).toBeOnTheScreen();
    await act(async () =>
      finish({
        from: 'Alex',
        places: [
          { name: 'Oak', latitude: 30.4352, longitude: -91.1903, accuracy: 4, notes: '' },
          { name: 'Creek', latitude: 30.42, longitude: -91.15, accuracy: null, notes: '' },
          { name: 'Tower', latitude: 30.45, longitude: -91.2, accuracy: null, notes: '' },
        ],
      }),
    );
    expect(screen.getByText('From Alex')).toBeOnTheScreen();
    await u.press(screen.getAllByRole('checkbox', { name: /Tower/ })[0]);
    await u.press(screen.getByRole('button', { name: 'Import selected' }));
    expect(alert.message('Imported')).toBe('Added 1 place, skipped 1 already saved.');
    expect((await listPlaces(db as never)).map((p) => p.name)).toEqual(['Creek', 'Oak']);
  });

  it('handles an empty download, cancel, a single import, and download errors', async () => {
    const u = userEvent.setup();
    const alert = mockAlert();
    await renderApp(<ShareScreen />);
    await u.press(screen.getByRole('button', { name: 'Look for nearby FindIt users' }));
    await act(async () => scan.onUser(user('d1', 'Alex', -50)));

    jest.mocked(fetchSharedPlaces).mockResolvedValueOnce({ from: 'Alex', places: [] });
    await u.press(screen.getByText('Alex'));
    expect(screen.getByText('They aren’t sharing any places.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Import selected' })).toBeDisabled();
    await u.press(screen.getByRole('button', { name: 'Cancel' }));

    await u.press(screen.getByRole('button', { name: 'Look for nearby FindIt users' }));
    await act(async () => scan.onUser(user('d1', 'Alex', -50)));
    jest.mocked(fetchSharedPlaces).mockResolvedValueOnce({
      from: 'Alex',
      places: [{ name: 'Creek', latitude: 1, longitude: 2, accuracy: null, notes: '' }],
    });
    await u.press(screen.getByText('Alex'));
    await u.press(screen.getByRole('button', { name: 'Import selected' }));
    expect(alert.message('Imported')).toBe('Added 1 place.');

    await u.press(screen.getByRole('button', { name: 'Look for nearby FindIt users' }));
    await act(async () => scan.onUser(user('d1', 'Alex', -50)));
    jest.mocked(fetchSharedPlaces).mockRejectedValueOnce(new Error('Connection lost'));
    await u.press(screen.getByText('Alex'));
    expect(alert.message('Could not download')).toBe('Connection lost');

    await u.press(screen.getByRole('button', { name: 'Look for nearby FindIt users' }));
    await act(async () => scan.onUser(user('d1', 'Alex', -50)));
    jest.mocked(fetchSharedPlaces).mockRejectedValueOnce('odd');
    await u.press(screen.getByText('Alex'));
    expect(alert.message('Could not download')).toBe('odd');
  });

  it('stops looking, needs permission, reports scan errors, and forgets quiet users', async () => {
    const u = userEvent.setup();
    const alert = mockAlert();
    await renderApp(<ShareScreen />);

    jest.mocked(requestBluetoothPermissions).mockResolvedValueOnce(false);
    await u.press(screen.getByRole('button', { name: 'Look for nearby FindIt users' }));
    expect(alert.message('Bluetooth permission needed')).toMatch(/find/);

    await u.press(screen.getByRole('button', { name: 'Look for nearby FindIt users' }));
    await u.press(screen.getByRole('button', { name: 'Stop looking' }));
    expect(scan.stop).toHaveBeenCalled();

    await u.press(screen.getByRole('button', { name: 'Look for nearby FindIt users' }));
    await act(async () => scan.onError('Location services off'));
    expect(alert.message('Scan failed')).toBe('Location services off');
    expect(screen.getByRole('button', { name: 'Look for nearby FindIt users' })).toBeOnTheScreen();

    jest.useFakeTimers({ now: 1_000_000 });
    try {
      await u.press(screen.getByRole('button', { name: 'Look for nearby FindIt users' }));
      await act(async () => {
        scan.onUser(user('old', 'Old', -60, 1_000_000 - 20_000));
        scan.onUser(user('new', 'New', -60, 1_000_000));
      });
      await act(async () => jest.advanceTimersByTime(3000));
      expect(screen.queryByText('Old')).not.toBeOnTheScreen();
      expect(screen.getByText('New')).toBeOnTheScreen();
      await act(async () => jest.advanceTimersByTime(3000));
      expect(screen.getByText('New')).toBeOnTheScreen();
    } finally {
      jest.useRealTimers();
    }
  });
});
