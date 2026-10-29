import { screen, userEvent } from '@testing-library/react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Linking } from 'react-native';

import AboutScreen from '../../src/app/about';
import { DOWNLOAD_URL } from '../../src/lib/links';
import { renderApp } from '../helpers/renderApp';

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '2026.10.29.001' } } }));

test('shows the version and what FindCache is', async () => {
  await renderApp(<AboutScreen />);
  expect(screen.getByRole('header', { name: 'FindCache' })).toBeOnTheScreen();
  expect(screen.getByText('Version 2026.10.29.001')).toBeOnTheScreen();
  expect(screen.getByText(/geocache-style/)).toBeOnTheScreen();
});

beforeEach(() => {
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
});

test('shows a QR code for the latest download', async () => {
  const user = userEvent.setup();
  await renderApp(<AboutScreen />);
  expect(screen.getByRole('image', { name: 'QR code: download the latest FindCache' })).toBeOnTheScreen();
  expect(screen.getByText(/Scan to get FindCache/)).toBeOnTheScreen();
  await user.press(screen.getByRole('link', { name: DOWNLOAD_URL }));
  expect(Linking.openURL).toHaveBeenCalledWith(DOWNLOAD_URL);
});

test('opens each set of licences', async () => {
  const user = userEvent.setup();
  await renderApp(<AboutScreen />);
  await user.press(screen.getByRole('button', { name: 'FindCache licence' }));
  expect(router.push).toHaveBeenLastCalledWith({ pathname: '/licenses', params: { kind: 'app' } });
  await user.press(screen.getByRole('button', { name: 'Open-source licences' }));
  expect(router.push).toHaveBeenLastCalledWith({ pathname: '/licenses', params: { kind: 'open-source' } });
  await user.press(screen.getByRole('button', { name: 'Map data' }));
  expect(router.push).toHaveBeenLastCalledWith({ pathname: '/licenses', params: { kind: 'map-data' } });
});

test('copes with an unknown version', async () => {
  const config = Constants as unknown as { expoConfig: { version?: string } | null };
  config.expoConfig = null;
  await renderApp(<AboutScreen />);
  expect(screen.getByText('Version unknown')).toBeOnTheScreen();
});
