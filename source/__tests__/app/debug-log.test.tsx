import { act, screen, userEvent } from '@testing-library/react-native';
import * as Sharing from 'expo-sharing';

import DebugLogScreen from '../../src/app/debug-log';
import { DEFAULT_SETTINGS } from '../../src/db/settings';
import * as logUpload from '../../src/lib/logUpload';
import { debugLog, flushDebugLog, setDebugLogging } from '../../src/lib/debugLog';
import { files } from '../helpers/fileSystemMock';
import { mockAlert, renderApp } from '../helpers/renderApp';

jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn(async () => {}) }));

afterEach(() => setDebugLogging(null, false));

const seed = async (db: unknown) => {
  setDebugLogging(db as never, true);
  debugLog('ble', 'Scan started', new Date(2026, 10, 2, 9, 0, 0).getTime());
  debugLog('ble', 'Found "Alex" (d1), RSSI -50', new Date(2026, 10, 2, 9, 0, 1).getTime());
  await flushDebugLog();
};

test('says how to turn logging on when it is off and empty', async () => {
  await renderApp(<DebugLogScreen />);
  expect(screen.getByText(/Debug logging is off/)).toBeOnTheScreen();
  expect(screen.getByText('The log is empty.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Share log' })).toBeDisabled();
});

test('shows the log newest first and refreshes', async () => {
  const user = userEvent.setup();
  const db = await renderApp(<DebugLogScreen />, { settings: { ...DEFAULT_SETTINGS, debugLogging: true }, seed });
  expect(screen.getByText(/Debug logging is on/)).toBeOnTheScreen();
  expect(screen.getAllByTestId('debug-entry').map((e) => e.props.children.join(''))).toEqual([
    '09:00:01 [ble] Found "Alex" (d1), RSSI -50',
    '09:00:00 [ble] Scan started',
  ]);
  setDebugLogging(db as never, true);
  debugLog('share', 'Sharing started', new Date(2026, 10, 2, 9, 0, 2).getTime());
  await act(async () => flushDebugLog());
  await user.press(screen.getByRole('button', { name: 'Refresh' }));
  expect(screen.getAllByTestId('debug-entry')).toHaveLength(3);
});

test('shares the log as a text file', async () => {
  const user = userEvent.setup();
  await renderApp(<DebugLogScreen />, { seed });
  await user.press(screen.getByRole('button', { name: 'Share log' }));
  const [uri, options] = jest.mocked(Sharing.shareAsync).mock.calls[0];
  expect(uri).toMatch(/^file:\/\/\/cache\/findcache-debug-log-\d{8}-\d{6}\.txt$/);
  expect(options).toMatchObject({ mimeType: 'text/plain' });
  expect(files[uri]).toBe('2026-11-02 09:00:00.000 [ble] Scan started\n2026-11-02 09:00:01.000 [ble] Found "Alex" (d1), RSSI -50\n');
});

describe('send log to KnG', () => {
  afterEach(() => jest.restoreAllMocks());

  it('has no send button until the endpoint is known', async () => {
    jest.spyOn(logUpload, 'uploadEnabled').mockReturnValue(false);
    await renderApp(<DebugLogScreen />, { seed });
    expect(screen.queryByRole('button', { name: 'Send log to KnG' })).not.toBeOnTheScreen();
  });

  it('asks first, then uploads the log and shows the reference', async () => {
    const user = userEvent.setup();
    const alert = mockAlert();
    jest.spyOn(logUpload, 'uploadEnabled').mockReturnValue(true);
    const upload = jest.spyOn(logUpload, 'uploadDebugLog').mockResolvedValue({ id: 'ref-1' });
    await renderApp(<DebugLogScreen />, { seed });
    await user.press(screen.getByRole('button', { name: 'Send log to KnG' }));
    expect(upload).not.toHaveBeenCalled();
    expect(alert.message('Send the log to KnG?')).toMatch(/2 entries.*Bluetooth device names.*6 months/s);
    await alert.press('Send the log to KnG?', 'Send');
    expect(upload).toHaveBeenCalledWith('2026-11-02 09:00:00.000 [ble] Scan started\n2026-11-02 09:00:01.000 [ble] Found "Alex" (d1), RSSI -50\n', expect.any(String));
    expect(alert.message('Log sent')).toMatch(/ref-1/);
  });

  it('reports a failed upload', async () => {
    const user = userEvent.setup();
    const alert = mockAlert();
    jest.spyOn(logUpload, 'uploadEnabled').mockReturnValue(true);
    jest.spyOn(logUpload, 'uploadDebugLog').mockRejectedValue(new Error('Network request failed'));
    await renderApp(<DebugLogScreen />, { seed });
    await user.press(screen.getByRole('button', { name: 'Send log to KnG' }));
    await alert.press('Send the log to KnG?', 'Send');
    expect(alert.message('Could not send the log')).toBe('Network request failed');
  });

  it('words a one-entry log in the singular and copes with non-Error failures', async () => {
    const user = userEvent.setup();
    const alert = mockAlert();
    jest.spyOn(logUpload, 'uploadEnabled').mockReturnValue(true);
    jest.spyOn(logUpload, 'uploadDebugLog').mockRejectedValue('offline');
    await renderApp(<DebugLogScreen />, {
      seed: async (db) => {
        setDebugLogging(db as never, true);
        debugLog('ble', 'Only entry');
        await flushDebugLog();
      },
    });
    await user.press(screen.getByRole('button', { name: 'Send log to KnG' }));
    expect(alert.message('Send the log to KnG?')).toMatch(/the 1 entry in this log/);
    await alert.press('Send the log to KnG?', 'Send');
    expect(alert.message('Could not send the log')).toBe('offline');
  });

  it('is disabled while the log is empty', async () => {
    jest.spyOn(logUpload, 'uploadEnabled').mockReturnValue(true);
    await renderApp(<DebugLogScreen />);
    expect(screen.getByRole('button', { name: 'Send log to KnG' })).toBeDisabled();
  });
});

test('reports when sharing fails', async () => {
  const user = userEvent.setup();
  const alert = mockAlert();
  await renderApp(<DebugLogScreen />, { seed });
  jest.mocked(Sharing.shareAsync).mockRejectedValueOnce(new Error('No app to share with'));
  await user.press(screen.getByRole('button', { name: 'Share log' }));
  expect(alert.message('Could not share the log')).toBe('No app to share with');
});

test('clears the log after confirming', async () => {
  const user = userEvent.setup();
  const alert = mockAlert();
  await renderApp(<DebugLogScreen />, { seed });
  await user.press(screen.getByRole('button', { name: 'Clear log' }));
  await alert.press('Clear the debug log?', 'Cancel');
  expect(screen.getAllByTestId('debug-entry')).toHaveLength(2);
  await user.press(screen.getByRole('button', { name: 'Clear log' }));
  await alert.press('Clear the debug log?', 'Clear');
  expect(screen.getByText('The log is empty.')).toBeOnTheScreen();
});

test('counts a single entry and reports odd share failures', async () => {
  const user = userEvent.setup();
  const alert = mockAlert();
  await renderApp(<DebugLogScreen />, {
    settings: { ...DEFAULT_SETTINGS, debugLogging: true },
    seed: async (db) => {
      setDebugLogging(db as never, true);
      debugLog('app', 'only one');
      await flushDebugLog();
    },
  });
  expect(screen.getByText(/1 entry, newest first/)).toBeOnTheScreen();
  jest.mocked(Sharing.shareAsync).mockRejectedValueOnce('odd');
  await user.press(screen.getByRole('button', { name: 'Share log' }));
  expect(alert.message('Could not share the log')).toBe('odd');
});
