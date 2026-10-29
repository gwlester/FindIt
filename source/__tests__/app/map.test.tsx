import { act, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import MapScreen from '../../src/app/map';
import { recordFind } from '../../src/db/finds';
import { DEFAULT_SETTINGS, loadSettings } from '../../src/db/settings';
import { SATELLITE_STYLE, STREETS_STYLE_URL } from '../../src/lib/mapSources';
import { emitPosition } from '../helpers/expoLocationMock';
import { useLocalSearchParams } from '../helpers/expoRouterMock';
import { place, renderApp } from '../helpers/renderApp';

const map = () => screen.getByTestId('map');
const camera = () => screen.getByTestId('map-camera');
const moveMapTo = (lng: number, lat: number) =>
  act(async () => map().props.onRegionDidChange({ nativeEvent: { center: [lng, lat], zoom: 12, bearing: 0, pitch: 0 } }));

test('shows every place and me on the street map, framed to fit the places', async () => {
  await renderApp(<MapScreen />, {
    places: [place('Oak', { latitude: 30, longitude: -91 }), place('Elm', { latitude: 31, longitude: -90 })],
    seed: (db) => recordFind(db as never, 1, { foundAt: 1, comment: '' }, 'once'),
  });
  expect(map().props.mapStyle).toBe(STREETS_STYLE_URL);
  expect(camera().props.initialViewState).toEqual({ bounds: [-91.1, 29.9, -89.9, 31.1] });
  expect(screen.getByText('Oak ✓')).toBeOnTheScreen();
  expect(screen.getByText('Elm')).toBeOnTheScreen();
  expect(screen.getByTestId('marker-1').props.lngLat).toEqual([-91, 30]);
  expect(screen.getByTestId('user-location')).toBeOnTheScreen();
});

test('with no places, the camera follows me', async () => {
  await renderApp(<MapScreen />);
  expect(camera().props.initialViewState).toBeUndefined();
  expect(camera().props.trackUserLocation).toBe('default');
  expect(screen.getByText('No places yet. Add one from the list.')).toBeOnTheScreen();
});

test('tapping a place shows it, with the distance from me, and Find it opens the compass', async () => {
  const user = userEvent.setup();
  await renderApp(<MapScreen />, { places: [place('Oak', { latitude: 30.4352, longitude: -91.1903 })] });
  await user.press(screen.getByTestId('marker-1'));
  expect(screen.getByRole('header', { name: 'Oak' })).toBeOnTheScreen();
  expect(screen.queryByText(/away$/)).not.toBeOnTheScreen();
  await act(async () => emitPosition({ latitude: 30.4352, longitude: -91.2003, accuracy: 5 }));
  expect(screen.getByText(/^9\d\d m away$/)).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Find it' }));
  expect(router.push).toHaveBeenLastCalledWith({ pathname: '/compass/[id]', params: { id: '1' } });
  await user.press(screen.getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('header', { name: 'Oak' })).not.toBeOnTheScreen();
});

test('opened for one place: centred on it and selected', async () => {
  useLocalSearchParams.mockReturnValue({ id: '2' });
  await renderApp(<MapScreen />, {
    places: [place('Oak', { latitude: 30, longitude: -91 }), place('Elm', { latitude: 31, longitude: -90 })],
  });
  expect(camera().props.initialViewState).toEqual({ center: [-90, 31], zoom: 16 });
  expect(screen.getByRole('header', { name: 'Elm' })).toBeOnTheScreen();
});

test('switches between map and satellite, remembers the choice, and warns outside the US', async () => {
  const user = userEvent.setup();
  const db = await renderApp(<MapScreen />, { places: [place('Oak')] });
  expect(screen.getByRole('button', { name: 'Map' })).toBeSelected();

  await user.press(screen.getByRole('button', { name: 'Satellite' }));
  expect(map().props.mapStyle).toBe(SATELLITE_STYLE);
  expect(screen.getByRole('button', { name: 'Satellite' })).toBeSelected();
  expect((await loadSettings(db as never)).mapLayer).toBe('satellite');
  expect(screen.queryByText(/US only/)).not.toBeOnTheScreen();

  await moveMapTo(-0.12, 51.5); // London
  expect(screen.getByText('Satellite imagery covers the US only.')).toBeOnTheScreen();
  await moveMapTo(-91.19, 30.45);
  expect(screen.queryByText(/US only/)).not.toBeOnTheScreen();

  await user.press(screen.getByRole('button', { name: 'Map' }));
  expect(map().props.mapStyle).toBe(STREETS_STYLE_URL);
  expect((await loadSettings(db as never)).mapLayer).toBe('streets');
});

test('starts with the saved layer', async () => {
  await renderApp(<MapScreen />, { settings: { ...DEFAULT_SETTINGS, mapLayer: 'satellite' } });
  expect(map().props.mapStyle).toBe(SATELLITE_STYLE);
});
