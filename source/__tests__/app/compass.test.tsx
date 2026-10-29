import { act, screen } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';

import CompassScreen from '../../src/app/compass/[id]';
import { emitHeading, emitPosition, emitPositionError } from '../helpers/expoLocationMock';
import { emitNative, nativeMock } from '../helpers/nativeModuleMock';
import { place, renderApp } from '../helpers/renderApp';

const OAK = place('Oak', { latitude: 30.4352, longitude: -91.1903, accuracy: 4, notes: 'Under the roots' });
const M_LAT = 110574;

beforeEach(() => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ id: '1' });
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
    settings: { displayName: 'x', units: 'imperial', highAccuracyGps: false },
  });
  await act(async () => emitPosition({ latitude: 30.4352, longitude: -91.1903, accuracy: 6 }));
  expect(screen.getByText(/within the uncertainty radius/)).toBeOnTheScreen();
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
