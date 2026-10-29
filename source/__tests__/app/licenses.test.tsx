import { screen, userEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';

import LicensesScreen from '../../src/app/licenses';
import licenses from '../../src/help/licenses.json';
import { useLocalSearchParams } from '../helpers/expoRouterMock';
import { renderApp } from '../helpers/renderApp';

test('FindCache’s own licence', async () => {
  useLocalSearchParams.mockReturnValue({ kind: 'app' });
  await renderApp(<LicensesScreen />);
  expect(screen.getByText(licenses.app)).toBeOnTheScreen();
});

test('open-source packages, each opening its licence text, and the native libraries', async () => {
  const user = userEvent.setup();
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  useLocalSearchParams.mockReturnValue({ kind: 'open-source' });
  await renderApp(<LicensesScreen />);
  const rn = licenses.packages.find((p) => p.name === 'react-native')!;
  const row = screen.getByRole('button', { name: `react-native ${rn.version}, ${rn.license}` });
  expect(screen.queryByText(rn.text)).not.toBeOnTheScreen();
  await user.press(row);
  expect(screen.getByText(rn.text)).toBeOnTheScreen();
  await user.press(row);
  expect(screen.queryByText(rn.text)).not.toBeOnTheScreen();

  const apache = licenses.native.find((n) => n.name === 'OkHttp and Okio')!;
  await user.press(screen.getByRole('button', { name: 'OkHttp and Okio, Apache-2.0' }));
  expect(screen.getByText((apache as { text: string }).text)).toBeOnTheScreen();
  await user.press(screen.getByRole('link', { name: 'MapLibre Native (Android), BSD-2-Clause' }));
  expect(Linking.openURL).toHaveBeenCalledWith('https://github.com/maplibre/maplibre-native/blob/main/LICENSE.md');
});

test('map data credits, with links', async () => {
  const user = userEvent.setup();
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  useLocalSearchParams.mockReturnValue({ kind: 'map-data' });
  await renderApp(<LicensesScreen />);
  expect(screen.getByText(/© OpenStreetMap contributors/)).toBeOnTheScreen();
  expect(screen.getByText(/Open Database License/)).toBeOnTheScreen();
  expect(screen.getByText(/public domain/)).toBeOnTheScreen();
  await user.press(screen.getByRole('link', { name: 'openstreetmap.org/copyright' }));
  expect(Linking.openURL).toHaveBeenCalledWith('https://www.openstreetmap.org/copyright');
});

test('defaults to the open-source list', async () => {
  await renderApp(<LicensesScreen />);
  expect(screen.getByRole('header', { name: 'Bundled JavaScript packages' })).toBeOnTheScreen();
});
