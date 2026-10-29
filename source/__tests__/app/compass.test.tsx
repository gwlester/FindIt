import { act, render, screen, userEvent } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';

import CompassScreen from '../../src/app/compass/[id]';
import { listFinds, recordFind } from '../../src/db/finds';
import { addPlace } from '../../src/db/locations';
import { DEFAULT_SETTINGS } from '../../src/db/settings';
import { SettingsProvider } from '../../src/hooks/useSettings';
import { formatDate } from '../../src/lib/format';
import { emitHeading, emitPosition, emitPositionError } from '../helpers/expoLocationMock';
import { activeKeepAwakeTags } from '../helpers/keepAwakeMock';
import { setCurrentDb } from '../helpers/expoSqliteMock';
import { svgTexts } from '../helpers/svg';
import { createTestDb } from '../helpers/testDb';
import { emitNative, nativeMock } from '../helpers/nativeModuleMock';
import { place, renderApp } from '../helpers/renderApp';

const OAK = place('Oak', { latitude: 30.4352, longitude: -91.1903, accuracy: 4, notes: 'Under the roots' });
const M_LAT = 110574;

beforeEach(() => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ id: '1' });
});

test('keeps the screen awake while open', async () => {
  await renderApp(<CompassScreen />, { places: [OAK] });
  expect(activeKeepAwakeTags()).toEqual(['compass']);
  await screen.unmount();
  expect(activeKeepAwakeTags()).toEqual([]);
});

test('before any fix', async () => {
  await renderApp(<CompassScreen />, { places: [OAK] });
  expect(screen.getByText('title:Oak')).toBeOnTheScreen();
  expect(screen.getByText('30.43520° N, 91.19030° W')).toBeOnTheScreen();
  expect(screen.getByText('Waiting for GPS fix…')).toBeOnTheScreen();
  expect(screen.getByText('—')).toBeOnTheScreen();
  expect(screen.getByText('uncertainty radius ± 4 m')).toBeOnTheScreen();
  expect(screen.getByText('Heading: waiting for compass…')).toBeOnTheScreen();
  expect(screen.getByText('Satellites: waiting for GNSS status…')).toBeOnTheScreen();
  expect(screen.getByText('GPS accuracy: — · place recorded ± 4 m')).toBeOnTheScreen();
  expect(screen.getByText('Under the roots')).toBeOnTheScreen();
  expect(nativeMock.startGnssStatus).toHaveBeenCalledWith(true);
});

test('distance, uncertainty, bearing, heading and satellites', async () => {
  await renderApp(<CompassScreen />, { places: [OAK] });
  await act(async () => emitPosition({ latitude: 30.4352 - 500 / M_LAT, longitude: -91.1903, accuracy: 3 }));
  expect(screen.getByText(/^≈ 50\d m$/)).toBeOnTheScreen();
  expect(screen.getByText('uncertainty radius ± 5 m')).toBeOnTheScreen();
  expect(screen.getByText('Bearing 000° N')).toBeOnTheScreen();
  expect(screen.getByText('GPS accuracy ± 3 m · place recorded ± 4 m')).toBeOnTheScreen();

  await act(async () => emitHeading({ trueHeading: 5, magHeading: 7, accuracy: 3 }));
  expect(screen.getByText('Heading 005° true')).toBeOnTheScreen();
  expect(screen.queryByText(/calibration/)).not.toBeOnTheScreen();

  await act(async () =>
    emitNative('onGnssStatus', { known: 31, inView: 22, used: 14, usedByConstellation: { Galileo: 4, GPS: 8 } }),
  );
  expect(screen.getByText('Satellites: 14 used · 22 in view · 31 known')).toBeOnTheScreen();
  expect(screen.getByText('GPS 8 · Galileo 4')).toBeOnTheScreen();
  expect(screen.getByText('Full GNSS tracking on (High-accuracy GPS)')).toBeOnTheScreen();
});

test('inside the uncertainty radius, magnetic heading needing calibration, imperial', async () => {
  await renderApp(<CompassScreen />, {
    places: [place('Here', { accuracy: null })],
    settings: { displayName: 'x', units: 'imperial', highAccuracyGps: false, searchAreaDistanceM: 50, findMode: 'once' as const, hideFound: false, shareHistoryDays: 90 },
  });
  await act(async () => emitPosition({ latitude: 30.4352, longitude: -91.1903, accuracy: 6 }));
  expect(screen.getByText('You’re in the search area — look around!')).toBeOnTheScreen();
  expect(screen.getByText('GPS accuracy ± 20 ft')).toBeOnTheScreen();
  await act(async () => emitHeading({ trueHeading: -1, magHeading: 90, accuracy: 1 }));
  expect(screen.getByText('Heading 090° magnetic')).toBeOnTheScreen();
  expect(screen.getByText(/needs calibration/)).toBeOnTheScreen();
  await act(async () => emitNative('onGnssStatus', { known: 1, inView: 1, used: 0, usedByConstellation: {} }));
  expect(screen.queryByText(/Full GNSS tracking/)).not.toBeOnTheScreen();
  expect(nativeMock.startGnssStatus).toHaveBeenCalledWith(false);
});

test('errors: permission, location, GNSS; unknown uncertainty; missing place', async () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ id: '42' });
  nativeMock.startGnssStatus.mockRejectedValueOnce(new Error('no GNSS'));
  await renderApp(<CompassScreen />);
  expect(screen.getByText('title:Find it')).toBeOnTheScreen();
  expect(screen.getByText('Satellites: no GNSS')).toBeOnTheScreen();
  await act(async () => emitPositionError('GPS lost'));
  expect(screen.getByText('GPS lost')).toBeOnTheScreen();
  await act(async () => emitPosition({ latitude: 1, longitude: 2 }));
  expect(screen.getByText('uncertainty unknown')).toBeOnTheScreen();
});

test('location permission denied', async () => {
  jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({ granted: false } as never);
  await renderApp(<CompassScreen />, { places: [OAK] });
  expect(screen.getByText('Location permission denied')).toBeOnTheScreen();
});

describe('averaging my position', () => {
  const south = (m: number, t: number, accuracy = 6) =>
    emitPosition({ latitude: 30.4352 - m / M_LAT, longitude: -91.1903, accuracy }, t * 1000);

  it('is offered once there is a fix', async () => {
    await renderApp(<CompassScreen />, { places: [OAK] });
    expect(screen.getByRole('button', { name: 'Average my position' })).toBeDisabled();
    await act(async () => south(500, 0));
    expect(screen.getByRole('button', { name: 'Average my position' })).toBeEnabled();
  });

  it('uses the averaged position and its tighter accuracy, until stopped', async () => {
    const user = userEvent.setup();
    await renderApp(<CompassScreen />, { places: [OAK] });
    await act(async () => south(500, 0));
    expect(screen.getByText('uncertainty radius ± 7 m')).toBeOnTheScreen(); // √(6² + 4²)

    await user.press(screen.getByRole('button', { name: 'Average my position' }));
    expect(screen.getByText('Averaging your position — stand still')).toBeOnTheScreen();
    await act(async () => {
      for (let t = 1; t <= 120; t++) south(500, t);
    });
    expect(screen.getByText('120 fixes · ± 4 m')).toBeOnTheScreen();
    expect(screen.getByText('uncertainty radius ± 5 m · averaged over 120 fixes')).toBeOnTheScreen();
    expect(screen.getByText(/^≈ 50\d m$/)).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Stop averaging' }));
    expect(screen.getByText('uncertainty radius ± 7 m')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Average my position' })).toBeOnTheScreen();
  });

  it('stops by itself when the user walks away', async () => {
    const user = userEvent.setup();
    await renderApp(<CompassScreen />, { places: [OAK] });
    await act(async () => south(500, 0));
    await user.press(screen.getByRole('button', { name: 'Average my position' }));
    await act(async () => {
      for (let t = 1; t <= 5; t++) south(500, t);
    });
    await act(async () => south(400, 6));
    expect(screen.getByText('Stopped averaging because you moved.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Average my position' })).toBeOnTheScreen();
    expect(screen.queryByText(/averaged over/)).not.toBeOnTheScreen();
    expect(screen.getByText(/^≈ 40\d m$/)).toBeOnTheScreen();
  });
});

describe('search area', () => {
  const south = (m: number, accuracy = 3) =>
    emitPosition({ latitude: 30.4352 - m / M_LAT, longitude: -91.1903, accuracy });

  it('replaces the arrow within the switch distance (default 50 m)', async () => {
    await renderApp(<CompassScreen />, { places: [OAK] });
    await act(async () => south(100));
    expect(svgTexts(screen.toJSON())).not.toContain('20 m');
    await act(async () => south(14));
    expect(svgTexts(screen.toJSON())).toContain('20 m');
    expect(screen.queryByText(/in the search area/)).not.toBeOnTheScreen();
  });

  it('follows the setting, in the chosen units, and can be turned off', async () => {
    await renderApp(<CompassScreen />, {
      places: [OAK],
      settings: { displayName: 'x', units: 'imperial', highAccuracyGps: true, searchAreaDistanceM: 20, findMode: 'once' as const, hideFound: false, shareHistoryDays: 90 },
    });
    await act(async () => south(30));
    expect(svgTexts(screen.toJSON()).some((t) => t.endsWith(' ft'))).toBe(false);
    // Position is smoothed, so a few fixes are needed to settle at 14 m.
    await act(async () => {
      for (let i = 0; i < 8; i++) south(14);
    });
    expect(svgTexts(screen.toJSON())).toContain('100 ft');
    await screen.unmount();

    await renderApp(<CompassScreen />, {
      places: [OAK],
      settings: { displayName: 'x', units: 'metric', highAccuracyGps: true, searchAreaDistanceM: null, findMode: 'once' as const, hideFound: false, shareHistoryDays: 90 },
    });
    await act(async () => south(5));
    expect(svgTexts(screen.toJSON())).not.toContain('10 m');
  });
});

describe('mark found', () => {
  const today = () => formatDate(Date.now());

  it('records a find with an optional comment', async () => {
    const user = userEvent.setup();
    const db = await renderApp(<CompassScreen />, { places: [OAK] });
    await user.press(screen.getByRole('button', { name: 'Mark found' }));
    expect(screen.getByText('Mark as found')).toBeOnTheScreen();
    await user.type(screen.getByPlaceholderText('Comment (optional)'), 'Easy');
    await user.press(screen.getByRole('button', { name: 'Save find' }));
    expect(screen.queryByText('Mark as found')).not.toBeOnTheScreen();
    expect(screen.getByText(`✓ Found ${today()}`)).toBeOnTheScreen();
    expect(screen.getByText('“Easy”')).toBeOnTheScreen();
    expect(await listFinds(db as never, 1)).toHaveLength(1);
  });

  it('in once mode updates the find; in log mode adds one', async () => {
    const user = userEvent.setup();
    const db = await renderApp(<CompassScreen />, { places: [OAK] });
    await user.press(screen.getByRole('button', { name: 'Mark found' }));
    await user.press(screen.getByRole('button', { name: 'Save find' }));
    await user.press(screen.getByRole('button', { name: 'Mark found' }));
    expect(screen.getByText('Update find')).toBeOnTheScreen();
    await user.type(screen.getByPlaceholderText('Comment (optional)'), 'Again');
    await user.press(screen.getByRole('button', { name: 'Save find' }));
    expect(await listFinds(db as never, 1)).toHaveLength(1);
    expect(screen.getByText('“Again”')).toBeOnTheScreen();
    await screen.unmount();

    const logDb = await renderApp(<CompassScreen />, {
      places: [OAK],
      settings: { ...DEFAULT_SETTINGS, findMode: 'log' },
    });
    for (let i = 0; i < 2; i++) {
      await user.press(screen.getByRole('button', { name: 'Mark found' }));
      expect(screen.getByText('Mark as found')).toBeOnTheScreen();
      await user.press(screen.getByRole('button', { name: 'Save find' }));
    }
    expect(await listFinds(logDb as never, 1)).toHaveLength(2);
    expect(screen.getByText(`✓ Found 2 times, last ${today()}`)).toBeOnTheScreen();
  });

  it('cancel records nothing; finds by others are labelled; off hides it', async () => {
    const user = userEvent.setup();
    const db = await renderApp(<CompassScreen />, { places: [OAK] });
    await user.press(screen.getByRole('button', { name: 'Mark found' }));
    await user.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(await listFinds(db as never, 1)).toEqual([]);
    expect(screen.queryByText(/Found/)).not.toBeOnTheScreen();
    await screen.unmount();

    const other = await createTestDb();
    await addPlace(other as never, OAK);
    await recordFind(other as never, 1, { foundAt: new Date(2026, 9, 20).getTime(), comment: '', finder: 'Alex' }, 'log');
    setCurrentDb(other);
    await render(
      <SettingsProvider>
        <CompassScreen />
      </SettingsProvider>,
    );
    await act(async () => {});
    expect(screen.getByText('✓ Found by Alex 2026-10-20')).toBeOnTheScreen();
    await screen.unmount();

    await renderApp(<CompassScreen />, { places: [OAK], settings: { ...DEFAULT_SETTINGS, findMode: 'off' } });
    expect(screen.queryByRole('button', { name: 'Mark found' })).not.toBeOnTheScreen();
  });
});
