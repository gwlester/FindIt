import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CompassScreen from '../../src/app/compass/[id]';
import AboutScreen from '../../src/app/about';
import HelpScreen from '../../src/app/help';
import LicensesScreen from '../../src/app/licenses';
import PlaceScreen from '../../src/app/place';
import SettingsScreen from '../../src/app/settings';
import { place, renderApp } from '../helpers/renderApp';

// Android's navigation bar covers the bottom of a screen, so scrolling content must end above it.
const NAV_BAR = 48;

beforeEach(() => {
  (useSafeAreaInsets as jest.Mock).mockReturnValue({ top: 0, left: 0, right: 0, bottom: NAV_BAR });
});

const bottomPadding = () => {
  return StyleSheet.flatten(screen.getByTestId('scroll').props.contentContainerStyle).paddingBottom as number;
};

test.each([
  ['Settings', <SettingsScreen key="s" />],
  ['About', <AboutScreen key="a" />],
  ['Help', <HelpScreen key="h" />],
  ['Licences', <LicensesScreen key="l" />],
  ['Place', <PlaceScreen key="p" />],
])('%s leaves room for the navigation bar', async (_name, ui) => {
  await renderApp(ui);
  expect(bottomPadding()).toBeGreaterThanOrEqual(NAV_BAR + 16);
});

test('Compass leaves room for the navigation bar', async () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ id: '1' });
  await renderApp(<CompassScreen />, { places: [place('Oak')] });
  expect(bottomPadding()).toBeGreaterThanOrEqual(NAV_BAR + 16);
});
