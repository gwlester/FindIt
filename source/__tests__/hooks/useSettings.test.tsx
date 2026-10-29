import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { saveSettings } from '../../src/db/settings';
import { SettingsProvider, useSettings } from '../../src/hooks/useSettings';
import { setCurrentDb } from '../helpers/expoSqliteMock';
import { createTestDb } from '../helpers/testDb';

const wrapper = ({ children }: { children: ReactNode }) => <SettingsProvider>{children}</SettingsProvider>;

test('loads stored settings and saves updates', async () => {
  const db = await createTestDb();
  await saveSettings(db as never, { displayName: 'Gerald', units: 'imperial', highAccuracyGps: false, searchAreaDistanceM: 50, findMode: 'once' as const, hideFound: false, shareHistoryDays: 90, mapLayer: 'streets' as const, compassBackground: 'plain' as const });
  setCurrentDb(db);
  const { result } = await renderHook(() => useSettings(), { wrapper });
  await act(async () => {});
  expect(result.current.loaded).toBe(true);
  expect(result.current.settings.displayName).toBe('Gerald');

  await act(() => result.current.updateSettings({ displayName: 'G', units: 'metric', highAccuracyGps: true, searchAreaDistanceM: 50, findMode: 'once' as const, hideFound: false, shareHistoryDays: 90, mapLayer: 'streets' as const, compassBackground: 'plain' as const }));
  expect(result.current.settings).toEqual({ displayName: 'G', units: 'metric', highAccuracyGps: true, searchAreaDistanceM: 50, findMode: 'once' as const, hideFound: false, shareHistoryDays: 90, mapLayer: 'streets' as const, compassBackground: 'plain' as const });
});

test('still marks settings loaded if reading fails', async () => {
  const db = await createTestDb();
  db.getAllAsync = jest.fn(async () => {
    throw new Error('disk');
  }) as never;
  setCurrentDb(db);
  const { result } = await renderHook(() => useSettings(), { wrapper });
  await act(async () => {});
  expect(result.current.loaded).toBe(true);
  expect(result.current.settings.displayName).toBe('FindCache user');
});

test('throws outside the provider', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  await expect(renderHook(() => useSettings())).rejects.toThrow('useSettings must be used inside SettingsProvider');
});
