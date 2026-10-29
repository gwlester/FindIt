import { act, render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import SettingsScreen from '../../src/app/settings';
import { DEFAULT_SETTINGS, loadSettings } from '../../src/db/settings';
import { SettingsProvider } from '../../src/hooks/useSettings';
import { setCurrentDb } from '../helpers/expoSqliteMock';
import { setDeviceName } from '../helpers/expoDeviceMock';
import { mockAlert, renderApp } from '../helpers/renderApp';
import { createTestDb } from '../helpers/testDb';

test('edits and saves every setting', async () => {
  const user = userEvent.setup();
  const db = await renderApp(<SettingsScreen />);
  const name = screen.getByDisplayValue('FindCache user');
  await user.clear(name);
  await user.type(name, 'Gerald');
  await user.press(screen.getByRole('checkbox', { name: /Imperial/ }));
  await user.press(screen.getByRole('checkbox', { name: /Metric/ }));
  await user.press(screen.getByRole('checkbox', { name: /Imperial/ }));
  await user.press(screen.getByRole('checkbox', { name: /High-accuracy GPS/ }));
  await user.press(screen.getByRole('button', { name: 'Save' }));
  expect(await loadSettings(db as never)).toMatchObject({ displayName: 'Gerald', units: 'imperial', highAccuracyGps: false });
  expect(router.back).toHaveBeenCalled();
});

test('starts with the device name as the sharing name', async () => {
  setDeviceName('Gerald’s Pixel');
  await renderApp(<SettingsScreen />);
  expect(screen.getByDisplayValue('Gerald’s Pixel')).toBeOnTheScreen();
});

test('requires a name', async () => {
  const user = userEvent.setup();
  const alert = mockAlert();
  await renderApp(<SettingsScreen />);
  await user.clear(screen.getByDisplayValue('FindCache user'));
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

describe('search-area distance', () => {
  it('steps the distance and saves it in metres', async () => {
    const user = userEvent.setup();
    const db = await renderApp(<SettingsScreen />);
    expect(screen.getByText('50 m')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Increase distance' }));
    await user.press(screen.getByRole('button', { name: 'Increase distance' }));
    await user.press(screen.getByRole('button', { name: 'Decrease distance' }));
    expect(screen.getByText('55 m')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Save' }));
    expect((await loadSettings(db as never)).searchAreaDistanceM).toBe(55);
  });

  it('converts the shown value when the units change', async () => {
    const user = userEvent.setup();
    const db = await renderApp(<SettingsScreen />);
    await user.press(screen.getByRole('checkbox', { name: /Imperial/ }));
    expect(screen.getByText('160 ft')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Increase distance' }));
    expect(screen.getByText('170 ft')).toBeOnTheScreen();
    await user.press(screen.getByRole('checkbox', { name: /Metric/ }));
    expect(screen.getByText('50 m')).toBeOnTheScreen();
    await user.press(screen.getByRole('checkbox', { name: /Imperial/ }));
    await user.press(screen.getByRole('button', { name: 'Save' }));
    expect((await loadSettings(db as never)).searchAreaDistanceM).toBeCloseTo(170 / 3.28084, 6);
  });

  it('can always show the arrow, and remembers the distance when turned back on', async () => {
    const user = userEvent.setup();
    const db = await renderApp(<SettingsScreen />);
    await user.press(screen.getByRole('button', { name: 'Increase distance' }));
    await user.press(screen.getByRole('checkbox', { name: /Always show the arrow/ }));
    expect(screen.queryByRole('button', { name: 'Increase distance' })).not.toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Save' }));
    expect((await loadSettings(db as never)).searchAreaDistanceM).toBeNull();

    await screen.unmount();
    await renderApp(<SettingsScreen />, { settings: { ...DEFAULT_SETTINGS, searchAreaDistanceM: null } });
    await user.press(screen.getByRole('checkbox', { name: /Always show the arrow/ }));
    expect(screen.getByText('50 m')).toBeOnTheScreen();
  });
});

describe('found places', () => {
  it('chooses off, once or log, and keeps the list filter', async () => {
    const user = userEvent.setup();
    const db = await renderApp(<SettingsScreen />, { settings: { ...DEFAULT_SETTINGS, hideFound: true, shareHistoryDays: 90, mapLayer: 'streets' as const, compassBackground: 'plain' as const } });
    expect(screen.getByRole('checkbox', { name: /Once per place/ })).toBeChecked();
    await user.press(screen.getByRole('checkbox', { name: /Keep a log/ }));
    expect(screen.getByRole('checkbox', { name: /Once per place/ })).not.toBeChecked();
    await user.press(screen.getByRole('button', { name: 'Save' }));
    expect(await loadSettings(db as never)).toMatchObject({ findMode: 'log', hideFound: true, shareHistoryDays: 90, mapLayer: 'streets' as const, compassBackground: 'plain' as const });
  });

  it('can turn marking found off', async () => {
    const user = userEvent.setup();
    const db = await renderApp(<SettingsScreen />);
    await user.press(screen.getByRole('checkbox', { name: /^Off/ }));
    await user.press(screen.getByRole('button', { name: 'Save' }));
    expect((await loadSettings(db as never)).findMode).toBe('off');
  });
});

describe('sharing history', () => {
  it('keeps the history for a chosen time, or forever', async () => {
    const user = userEvent.setup();
    const db = await renderApp(<SettingsScreen />);
    expect(screen.getByRole('checkbox', { name: /90 days/ })).toBeChecked();
    await user.press(screen.getByRole('checkbox', { name: /Forever/ }));
    expect(screen.getByRole('checkbox', { name: /90 days/ })).not.toBeChecked();
    await user.press(screen.getByRole('button', { name: 'Save' }));
    expect((await loadSettings(db as never)).shareHistoryDays).toBeNull();
  });

  it('can keep it for a week', async () => {
    const user = userEvent.setup();
    const db = await renderApp(<SettingsScreen />, { settings: { ...DEFAULT_SETTINGS, shareHistoryDays: null } });
    expect(screen.getByRole('checkbox', { name: /Forever/ })).toBeChecked();
    await user.press(screen.getByRole('checkbox', { name: /7 days/ }));
    await user.press(screen.getByRole('button', { name: 'Save' }));
    expect((await loadSettings(db as never)).shareHistoryDays).toBe(7);
  });
});

describe('search area background', () => {
  it('chooses plain, map or satellite', async () => {
    const user = userEvent.setup();
    const db = await renderApp(<SettingsScreen />);
    expect(screen.getByRole('checkbox', { name: /Plain/ })).toBeChecked();
    await user.press(screen.getByRole('checkbox', { name: /Satellite/ }));
    await user.press(screen.getByRole('button', { name: 'Save' }));
    expect((await loadSettings(db as never)).compassBackground).toBe('satellite');
  });

  it('can show the street map', async () => {
    const user = userEvent.setup();
    const db = await renderApp(<SettingsScreen />, { settings: { ...DEFAULT_SETTINGS, compassBackground: 'satellite' } });
    await user.press(screen.getByRole('checkbox', { name: /^Map/ }));
    await user.press(screen.getByRole('button', { name: 'Save' }));
    expect((await loadSettings(db as never)).compassBackground).toBe('streets');
  });
});
