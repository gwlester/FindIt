import { act, screen } from '@testing-library/react-native';
import { Dimensions, Keyboard, StyleSheet } from 'react-native';
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

// The help pages scroll past their end so the last line can be brought up near the top of the screen.
test.each([
  ['Help', <HelpScreen key="h" />],
  ['About', <AboutScreen key="a" />],
  ['Licences', <LicensesScreen key="l" />],
  ['Settings', <SettingsScreen key="s" />],
  ['Place (Add Place)', <PlaceScreen key="p" />],
])('%s scrolls past its end', async (_name, ui) => {
  await renderApp(ui);
  expect(bottomPadding()).toBe(NAV_BAR + Dimensions.get('window').height - 0 - 56 - 56);
});

test('Compass scrolls past its end', async () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ id: '1' });
  await renderApp(<CompassScreen />, { places: [place('Oak')] });
  expect(bottomPadding()).toBe(NAV_BAR + Dimensions.get('window').height - 0 - 56 - 56);
});

// Edge-to-edge Android does not resize the screen for the keyboard, so a form must reserve its height:
// otherwise the Save button stays hidden behind the keyboard while a Note is typed.
test('Place reserves room for the keyboard so Save can be scrolled above it', async () => {
  const listeners: Record<string, (e: unknown) => void> = {};
  jest.spyOn(Keyboard, 'addListener').mockImplementation(((name: string, fn: (e: unknown) => void) => {
    listeners[name] = fn;
    return { remove: jest.fn() };
  }) as never);
  await renderApp(<PlaceScreen />);
  const resting = bottomPadding();
  await act(async () => listeners.keyboardDidShow({ endCoordinates: { height: 300 } }));
  expect(bottomPadding()).toBe(resting - NAV_BAR + 300);
  await act(async () => listeners.keyboardDidHide({}));
  expect(bottomPadding()).toBe(resting);
});
