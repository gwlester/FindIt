import { render, screen, userEvent } from '@testing-library/react-native';

import { UpdateCheck } from '../../src/components/UpdateCheck';
import * as updates from '../../src/lib/updates';
import { mockAlert } from '../helpers/renderApp';

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '2026.11.03.001' } } }));

const UPDATE = { version: '2026.11.04.001', apkUrl: 'https://example.com/findcache.apk', notes: 'Fixes things' };

afterEach(() => jest.restoreAllMocks());

test('says when the app is up to date', async () => {
  const user = userEvent.setup();
  const alert = mockAlert();
  jest.spyOn(updates, 'checkForUpdate').mockResolvedValue(null);
  await render(<UpdateCheck />);
  expect(screen.getByText(/Version 2026\.11\.03\.001/)).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Check for updates' }));
  expect(alert.message('You are up to date')).toMatch(/2026\.11\.03\.001/);
});

test('offers a newer version and installs it when confirmed', async () => {
  const user = userEvent.setup();
  const alert = mockAlert();
  jest.spyOn(updates, 'checkForUpdate').mockResolvedValue(UPDATE);
  const install = jest.spyOn(updates, 'downloadAndInstall').mockResolvedValue();
  await render(<UpdateCheck />);
  await user.press(screen.getByRole('button', { name: 'Check for updates' }));
  expect(alert.message('Version 2026.11.04.001 is available')).toMatch(/Fixes things/);
  expect(install).not.toHaveBeenCalled();
  await alert.press('Version 2026.11.04.001 is available', 'Download and install');
  expect(install).toHaveBeenCalledWith(UPDATE);
});

test('offers an update with no release notes', async () => {
  const user = userEvent.setup();
  const alert = mockAlert();
  jest.spyOn(updates, 'checkForUpdate').mockResolvedValue({ ...UPDATE, notes: '' });
  await render(<UpdateCheck />);
  await user.press(screen.getByRole('button', { name: 'Check for updates' }));
  expect(alert.message('Version 2026.11.04.001 is available')).toMatch(/Install it now\?/);
});

test('copes with failures that are not Error objects', async () => {
  const user = userEvent.setup();
  const alert = mockAlert();
  jest.spyOn(updates, 'checkForUpdate').mockRejectedValue('offline');
  await render(<UpdateCheck />);
  await user.press(screen.getByRole('button', { name: 'Check for updates' }));
  expect(alert.message('Could not check for updates')).toBe('offline');
});

test('reports when the check or the install fails', async () => {
  const user = userEvent.setup();
  const alert = mockAlert();
  jest.spyOn(updates, 'checkForUpdate').mockRejectedValueOnce(new Error('GitHub answered 403'));
  await render(<UpdateCheck />);
  await user.press(screen.getByRole('button', { name: 'Check for updates' }));
  expect(alert.message('Could not check for updates')).toBe('GitHub answered 403');

  jest.spyOn(updates, 'checkForUpdate').mockResolvedValue(UPDATE);
  jest.spyOn(updates, 'downloadAndInstall').mockRejectedValue(new Error('Disk full'));
  await user.press(screen.getByRole('button', { name: 'Check for updates' }));
  await alert.press('Version 2026.11.04.001 is available', 'Download and install');
  expect(alert.message('Could not install the update')).toBe('Disk full');
});
