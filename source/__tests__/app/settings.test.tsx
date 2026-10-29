import { act, render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import SettingsScreen from '../../src/app/settings';
import { loadSettings } from '../../src/db/settings';
import { SettingsProvider } from '../../src/hooks/useSettings';
import { setCurrentDb } from '../helpers/expoSqliteMock';
import { mockAlert, renderApp } from '../helpers/renderApp';
import { createTestDb } from '../helpers/testDb';

test('edits and saves every setting', async () => {
  const user = userEvent.setup();
  const db = await renderApp(<SettingsScreen />);
  const name = screen.getByDisplayValue('FindIt user');
  await user.clear(name);
  await user.type(name, 'Gerald');
  await user.press(screen.getByRole('checkbox', { name: /Imperial/ }));
  await user.press(screen.getByRole('checkbox', { name: /Metric/ }));
  await user.press(screen.getByRole('checkbox', { name: /Imperial/ }));
  await user.press(screen.getByRole('checkbox', { name: /High-accuracy GPS/ }));
  await user.press(screen.getByRole('button', { name: 'Save' }));
  expect(await loadSettings(db as never)).toEqual({ displayName: 'Gerald', units: 'imperial', highAccuracyGps: false });
  expect(router.back).toHaveBeenCalled();
});

test('requires a name', async () => {
  const user = userEvent.setup();
  const alert = mockAlert();
  await renderApp(<SettingsScreen />);
  await user.clear(screen.getByDisplayValue('FindIt user'));
  await user.press(screen.getByRole('button', { name: 'Save' }));
  expect(alert.message('Name required')).toMatch(/recognise you/);
  expect(router.back).not.toHaveBeenCalled();
});

test('renders nothing until settings are loaded', async () => {
  const db = await createTestDb();
  let release!: () => void;
  const original = db.getAllAsync.bind(db);
  db.getAllAsync = (async (...args: Parameters<typeof original>) => {
    await new Promise<void>((r) => (release = r));
    return original(...args);
  }) as typeof db.getAllAsync;
  setCurrentDb(db);
  await render(
    <SettingsProvider>
      <SettingsScreen />
    </SettingsProvider>,
  );
  expect(screen.queryByRole('button', { name: 'Save' })).not.toBeOnTheScreen();
  await act(async () => release());
  expect(screen.getByRole('button', { name: 'Save' })).toBeOnTheScreen();
});
