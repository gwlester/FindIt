import { act, screen, userEvent } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';

import PlaceScreen from '../../src/app/place';
import { getPlace, listPlaces } from '../../src/db/locations';
import { emitPosition } from '../helpers/expoLocationMock';
import { mockAlert, place, renderApp } from '../helpers/renderApp';

const user = () => userEvent.setup();

test('adds a place with typed geocaching-style coordinates', async () => {
  const u = user();
  const db = await renderApp(<PlaceScreen />);
  expect(screen.getByText('title:Add place')).toBeOnTheScreen();
  await u.type(screen.getByPlaceholderText(/Old oak/), '  Oak  ');
  await u.type(screen.getByPlaceholderText(/N 30° 26.112/), 'N 30 26.112');
  await u.type(screen.getByPlaceholderText(/W 091° 11.418/), 'W 091 11.418');
  await u.type(screen.getByPlaceholderText(/Hints/), ' roots ');
  await u.press(screen.getByRole('button', { name: 'Save' }));
  const [saved] = await listPlaces(db as never);
  expect(saved).toMatchObject({ name: 'Oak', notes: 'roots', accuracy: null, source: 'local' });
  expect(saved.latitude).toBeCloseTo(30.4352, 6);
  expect(router.back).toHaveBeenCalled();
});

test('validates name and coordinates', async () => {
  const u = user();
  const alert = mockAlert();
  await renderApp(<PlaceScreen />);
  await u.press(screen.getByRole('button', { name: 'Save' }));
  expect(alert.message('Name required')).toBeTruthy();
  await u.type(screen.getByPlaceholderText(/Old oak/), 'Oak');
  await u.press(screen.getByRole('button', { name: 'Save' }));
  expect(alert.message('Invalid latitude')).toBeTruthy();
  await u.type(screen.getByPlaceholderText(/N 30° 26.112/), '30');
  await u.press(screen.getByRole('button', { name: 'Save' }));
  expect(alert.message('Invalid longitude')).toBeTruthy();
});

test('uses the current position and records its accuracy; typing clears it', async () => {
  const u = user();
  const db = await renderApp(<PlaceScreen />);
  expect(screen.getByRole('button', { name: 'Waiting for GPS…' })).toBeDisabled();
  await act(async () => emitPosition({ latitude: 30.1234567, longitude: -91.7654321, accuracy: 4 }));
  expect(screen.getByText('GPS accuracy now ± 4 m')).toBeOnTheScreen();
  await u.press(screen.getByRole('button', { name: 'Use current' }));
  expect(screen.getByDisplayValue('30.123457')).toBeOnTheScreen();
  expect(screen.getByText('Recorded accuracy ± 4 m')).toBeOnTheScreen();
  await u.type(screen.getByPlaceholderText(/Old oak/), 'Here');
  await u.press(screen.getByRole('button', { name: 'Save' }));
  expect((await listPlaces(db as never))[0].accuracy).toBe(4);

  await u.type(screen.getByDisplayValue('30.123457'), '1');
  expect(screen.queryByText(/Recorded accuracy/)).not.toBeOnTheScreen();
});

test('averages the position', async () => {
  const u = user();
  await renderApp(<PlaceScreen />);
  await u.press(screen.getByRole('button', { name: 'Average position' }));
  expect(screen.getByText('Averaging — keep the phone still')).toBeOnTheScreen();
  await act(async () => {
    for (let t = 0; t < 10; t++) emitPosition({ latitude: 30.4352, longitude: -91.1903, accuracy: 3 }, t * 1000);
  });
  await u.press(screen.getByRole('button', { name: 'Use average' }));
  expect(screen.getByDisplayValue('30.4352000')).toBeOnTheScreen();
  expect(screen.getByDisplayValue('-91.1903000')).toBeOnTheScreen();
  expect(screen.getByText('Recorded accuracy ± 3 m')).toBeOnTheScreen();

  await u.press(screen.getByRole('button', { name: 'Average position' }));
  await u.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByText(/Averaging/)).not.toBeOnTheScreen();
});

test('without location permission', async () => {
  jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({ granted: false } as never);
  await renderApp(<PlaceScreen />);
  expect(screen.getByText(/Location permission denied/)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Average position' })).toBeDisabled();
});

test('edits an existing place, keeping its source', async () => {
  const u = user();
  jest.mocked(useLocalSearchParams).mockReturnValue({ id: '1' });
  const db = await renderApp(<PlaceScreen />, { places: [place('Oak', { notes: 'n', source: 'Alex' })] });
  expect(screen.getByText('title:Edit place')).toBeOnTheScreen();
  const name = screen.getByDisplayValue('Oak');
  await u.clear(name);
  await u.type(name, 'Big oak');
  await u.press(screen.getByRole('button', { name: 'Save' }));
  expect(await getPlace(db as never, 1)).toMatchObject({ name: 'Big oak', notes: 'n', source: 'Alex', accuracy: 4 });
});

test('ignores a missing place id and reports save failures', async () => {
  const u = user();
  const alert = mockAlert();
  jest.mocked(useLocalSearchParams).mockReturnValue({ id: '99' });
  const db = await renderApp(<PlaceScreen />);
  await u.type(screen.getByPlaceholderText(/Old oak/), 'X');
  await u.type(screen.getByPlaceholderText(/N 30° 26.112/), '1');
  await u.type(screen.getByPlaceholderText(/W 091° 11.418/), '2');
  db.runAsync = jest.fn(async () => {
    throw new Error('disk full');
  }) as never;
  await u.press(screen.getByRole('button', { name: 'Save' }));
  expect(alert.message('Could not save')).toBe('Error: disk full');
});
