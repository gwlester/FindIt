import { render, screen, within } from '@testing-library/react-native';

import RootLayout from '../../src/app/_layout';
import { setCurrentDb } from '../helpers/expoSqliteMock';
import { flush } from '../helpers/renderApp';
import { DEFAULT_SETTINGS, saveSettings } from '../../src/db/settings';
import { isDebugLogging, setDebugLogging } from '../../src/lib/debugLog';
import { createRawTestDb, createTestDb } from '../helpers/testDb';

test('migrates the database, then renders every route', async () => {
  const db = createRawTestDb();
  setCurrentDb(db);
  await render(<RootLayout />);
  await flush();
  for (const name of ['index', 'place', 'compass/[id]', 'share', 'share-history', 'map', 'offline-maps', 'help', 'about', 'licenses', 'debug-log', 'files', 'settings']) {
    expect(screen.getByTestId(`screen-${name}`)).toBeOnTheScreen();
  }
  expect(screen.getByText('title:Import / Export')).toBeOnTheScreen();
  // Screens without their own header buttons get the help button from the layout.
  for (const name of ['place', 'compass/[id]', 'share', 'share-history', 'offline-maps', 'files', 'settings', 'debug-log']) {
    expect(within(screen.getByTestId(`screen-${name}`)).getByRole('button', { name: 'Help' })).toBeOnTheScreen();
  }
  // Settings is one tap away from every screen except Settings itself (the places screen and the
  // map put their own button in their header).
  for (const name of ['place', 'compass/[id]', 'share', 'share-history', 'offline-maps', 'files', 'help', 'about', 'licenses', 'debug-log']) {
    expect(within(screen.getByTestId(`screen-${name}`)).getByRole('button', { name: 'Settings' })).toBeOnTheScreen();
  }
  expect(within(screen.getByTestId('screen-settings')).queryByRole('button', { name: 'Settings' })).not.toBeOnTheScreen();
  expect(await db.getFirstAsync('PRAGMA user_version')).toEqual({ user_version: 4 });
});

test('installs the crash handler as soon as the layout is loaded', () => {
  const set = jest.spyOn(ErrorUtils, 'setGlobalHandler').mockImplementation(() => {});
  jest.isolateModules(() => {
    require('../../src/app/_layout');
  });
  expect(set).toHaveBeenCalled();
  set.mockRestore();
});

test('a screen that throws shows the fallback instead of crashing the app', async () => {
  const db = createRawTestDb();
  setCurrentDb(db);
  jest.spyOn(console, 'error').mockImplementation(() => {});
  const layout = require('../../src/components/DebugLogging');
  const spy = jest.spyOn(layout, 'DebugLogging').mockImplementation(() => {
    throw new Error('provider exploded');
  });
  await render(<RootLayout />);
  await flush();
  expect(screen.getByText('Something went wrong')).toBeOnTheScreen();
  spy.mockRestore();
  jest.restoreAllMocks();
});

test('turns the debug log on when Settings asks for it', async () => {
  const db = await createTestDb();
  await saveSettings(db as never, { ...DEFAULT_SETTINGS, debugLogging: true });
  setCurrentDb(db);
  await render(<RootLayout />);
  await flush();
  expect(isDebugLogging()).toBe(true);
  setDebugLogging(null, false);
});
