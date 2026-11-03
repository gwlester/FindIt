import { act, render } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { DebugLogging } from '../../src/components/DebugLogging';
import { DEFAULT_SETTINGS, saveSettings } from '../../src/db/settings';
import { SettingsProvider, useSettings } from '../../src/hooks/useSettings';
import { flushDebugLog, isDebugLogging, readDebugLog, setDebugLogging } from '../../src/lib/debugLog';
import { setCurrentDb } from '../helpers/expoSqliteMock';
import { emitNative } from '../helpers/nativeModuleMock';
import { flush } from '../helpers/renderApp';
import { createTestDb, type TestDb } from '../helpers/testDb';

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '2026.11.02.001' } } }));

let db: TestDb;
let update: ReturnType<typeof useSettings>['updateSettings'];
function Grab() {
  update = useSettings().updateSettings;
  return null;
}

async function mount(debugLogging: boolean) {
  db = await createTestDb();
  await saveSettings(db as never, { ...DEFAULT_SETTINGS, debugLogging });
  setCurrentDb(db);
  await render(
    <SettingsProvider>
      <DebugLogging />
      <Grab />
    </SettingsProvider>,
  );
  await flush();
}
const messages = async () => {
  await flushDebugLog();
  return (await readDebugLog(db as never)).reverse().map((e) => `[${e.tag}] ${e.message}`);
};

afterEach(() => {
  setDebugLogging(null, false);
  db.close();
});

test('off: nothing is logged, not even the native server', async () => {
  await mount(false);
  expect(isDebugLogging()).toBe(false);
  emitNative('onShareLog', { message: 'Advertising started' });
  expect(await messages()).toEqual([]);
});

test('on: starts with what is running where, and records the native server', async () => {
  Object.defineProperty(Platform, 'Version', { value: 35, configurable: true });
  await mount(true);
  expect(isDebugLogging()).toBe(true);
  emitNative('onShareLog', { message: 'Advertising started' });
  expect(await messages()).toEqual([
    '[app] Debug logging on: FindCache 2026.11.02.001, Android 15 (API 35), Google Pixel 8',
    '[share-server] Advertising started',
  ]);
});

test('turning it off stops logging', async () => {
  await mount(true);
  await act(async () => update({ ...DEFAULT_SETTINGS, debugLogging: false }));
  expect(isDebugLogging()).toBe(false);
  emitNative('onShareLog', { message: 'ignored' });
  expect((await messages()).some((m) => m.includes('ignored'))).toBe(false);
});

test('copes with unknown version and device details', async () => {
  const device = jest.requireMock('expo-device') as Record<string, unknown>;
  const constants = (jest.requireMock('expo-constants') as { default: { expoConfig: unknown } }).default;
  jest.replaceProperty(device, 'osVersion', null);
  jest.replaceProperty(device, 'manufacturer', null);
  jest.replaceProperty(device, 'modelName', null);
  jest.replaceProperty(constants, 'expoConfig', null);
  Object.defineProperty(Platform, 'Version', { value: 30, configurable: true });
  await mount(true);
  expect((await messages())[0]).toBe('[app] Debug logging on: FindCache unknown, Android ? (API 30)');
});
