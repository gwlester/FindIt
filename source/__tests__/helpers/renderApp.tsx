import { act, render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Alert, type AlertButton } from 'react-native';

import { addPlace, type NewPlace } from '../../src/db/locations';
import { saveSettings, type Settings } from '../../src/db/settings';
import { SettingsProvider } from '../../src/hooks/useSettings';
import { setCurrentDb } from './expoSqliteMock';
import { createTestDb, type TestDb } from './testDb';

export const flush = () => act(async () => {});

export function place(name: string, extra: Partial<NewPlace> = {}): NewPlace {
  return { name, latitude: 30.4352, longitude: -91.1903, accuracy: 4, notes: '', source: 'local', ...extra };
}

/** Renders a screen with a fresh test database (optionally seeded) and the settings provider. */
export async function renderApp(
  ui: ReactElement,
  { places = [], settings }: { places?: NewPlace[]; settings?: Settings } = {},
): Promise<TestDb> {
  const db = await createTestDb();
  for (const p of places) await addPlace(db as never, p);
  if (settings) await saveSettings(db as never, settings);
  setCurrentDb(db);
  await render(<SettingsProvider>{ui}</SettingsProvider>);
  await flush();
  return db;
}

/** Spies on Alert.alert; `press(title, button)` presses a button of the latest matching alert. */
export function mockAlert() {
  const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const find = (title: string) => {
    const call = [...spy.mock.calls].reverse().find((c) => c[0] === title);
    if (!call) throw new Error(`No alert titled "${title}"`);
    return call;
  };
  return {
    spy,
    message: (title: string) => find(title)[1],
    press: async (title: string, button: string) => {
      const b = ((find(title)[2] ?? []) as AlertButton[]).find((x) => x.text === button);
      if (!b) throw new Error(`No button "${button}" in alert "${title}"`);
      await act(async () => {
        await b.onPress?.();
      });
    },
  };
}
