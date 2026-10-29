import { act, render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import PlacesScreen from '../../src/app/index';
import { recordFind } from '../../src/db/finds';
import { addPlace, listPlaces } from '../../src/db/locations';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../../src/db/settings';
import { SettingsProvider } from '../../src/hooks/useSettings';
import { emitPosition } from '../helpers/expoLocationMock';
import { setCurrentDb } from '../helpers/expoSqliteMock';
import { createTestDb } from '../helpers/testDb';
import { mockAlert, place, renderApp } from '../helpers/renderApp';

test('shows an empty state', async () => {
  await renderApp(<PlacesScreen />);
  expect(screen.getByText(/No places yet/)).toBeOnTheScreen();
  expect(screen.queryByText(/Tap a place to find it/)).not.toBeOnTheScreen();
});

test('lists places by name with source and distance, and navigates', async () => {
  const user = userEvent.setup();
  await renderApp(<PlacesScreen />, {
    places: [place('Zoo gate', { latitude: 30.5 }), place('Bridge', { source: 'Alex' })],
  });
  const names = screen.getAllByText(/^(Bridge|Zoo gate)$/).map((n) => n.props.children);
  expect(names).toEqual(['Bridge', 'Zoo gate']);
  expect(screen.getByText('From Alex')).toBeOnTheScreen();
  expect(screen.queryByText(/ km$/)).not.toBeOnTheScreen();

  await act(async () => emitPosition({ latitude: 30.4352, longitude: -91.1903, accuracy: 5 }));
  expect(screen.getByText('0 m')).toBeOnTheScreen();
  expect(screen.getByText(/^7\.\d\d km$/)).toBeOnTheScreen();

  await user.press(screen.getByText('Bridge'));
  expect(router.push).toHaveBeenLastCalledWith({ pathname: '/compass/[id]', params: { id: '2' } });
  await user.press(screen.getByRole('button', { name: 'Add place' }));
  expect(router.push).toHaveBeenLastCalledWith('/place');
  await user.press(screen.getByRole('button', { name: 'Share nearby' }));
  expect(router.push).toHaveBeenLastCalledWith('/share');
  await user.press(screen.getByRole('button', { name: 'Map' }));
  expect(router.push).toHaveBeenLastCalledWith('/map');
  await user.press(screen.getByRole('button', { name: 'Help' }));
  await user.press(screen.getByRole('button', { name: 'Help for this screen' }));
  expect(router.push).toHaveBeenLastCalledWith({ pathname: '/help', params: { topic: 'places' } });
  await user.press(screen.getByRole('button', { name: 'Files' }));
  expect(router.push).toHaveBeenLastCalledWith('/files');
  await user.press(screen.getByRole('button', { name: 'Settings' }));
  expect(router.push).toHaveBeenLastCalledWith('/settings');
});

test('long-press offers edit, show on map and delete', async () => {
  const user = userEvent.setup();
  const alert = mockAlert();
  const db = await renderApp(<PlacesScreen />, { places: [place('Oak')] });

  await user.longPress(screen.getByText('Oak'));
  await alert.press('Oak', 'Edit');
  expect(router.push).toHaveBeenLastCalledWith({ pathname: '/place', params: { id: '1' } });

  await user.longPress(screen.getByText('Oak'));
  await alert.press('Oak', 'Show on map');
  expect(router.push).toHaveBeenLastCalledWith({ pathname: '/map', params: { id: '1' } });

  await user.longPress(screen.getByText('Oak'));
  await alert.press('Oak', 'Delete');
  await alert.press('Delete place?', 'Delete');
  expect(await listPlaces(db as never)).toEqual([]);
  expect(await screen.findByText(/No places yet/)).toBeOnTheScreen();
});

test('reports load failures', async () => {
  const alert = mockAlert();
  const db = await createTestDb();
  db.getAllAsync = jest.fn(async () => {
    throw new Error('disk');
  }) as never;
  setCurrentDb(db);
  await render(
    <SettingsProvider>
      <PlacesScreen />
    </SettingsProvider>,
  );
  await act(async () => {});
  expect(alert.message('Could not load places')).toBe('Error: disk');
});

describe('found places', () => {
  async function withFinds(settings = DEFAULT_SETTINGS) {
    const db = await createTestDb();
    for (const name of ['Ash', 'Elm', 'Oak']) await addPlace(db as never, place(name));
    await recordFind(db as never, 1, { foundAt: new Date(2026, 9, 20).getTime(), comment: '' }, 'log');
    await recordFind(db as never, 1, { foundAt: new Date(2026, 9, 21).getTime(), comment: '' }, 'log');
    await recordFind(db as never, 2, { foundAt: new Date(2026, 9, 22).getTime(), comment: '', finder: 'Alex' }, 'log');
    await saveSettings(db as never, settings);
    setCurrentDb(db);
    await render(
      <SettingsProvider>
        <PlacesScreen />
      </SettingsProvider>,
    );
    await act(async () => {});
    return db;
  }

  it('marks found places in the list', async () => {
    await withFinds();
    expect(screen.getByText('✓ Found 2 times, last 2026-10-21')).toBeOnTheScreen();
    expect(screen.getByText('✓ Found by Alex 2026-10-22')).toBeOnTheScreen();
  });

  it('can hide the places I found, and remembers that', async () => {
    const user = userEvent.setup();
    const db = await withFinds();
    await user.press(screen.getByRole('checkbox', { name: /Hide found places/ }));
    expect(screen.queryByText('Ash')).not.toBeOnTheScreen();
    expect(screen.getByText('Elm')).toBeOnTheScreen(); // found by someone else, not me
    expect(screen.getByText('1 found place hidden')).toBeOnTheScreen();
    expect((await loadSettings(db as never)).hideFound).toBe(true);
    await user.press(screen.getByRole('checkbox', { name: /Hide found places/ }));
    expect(screen.getByText('Ash')).toBeOnTheScreen();
  });

  it('shows nothing about finds when marking found is off', async () => {
    await withFinds({ ...DEFAULT_SETTINGS, findMode: 'off', hideFound: true, shareHistoryDays: 90, mapLayer: 'streets' as const, compassBackground: 'plain' as const });
    expect(screen.getByText('Ash')).toBeOnTheScreen();
    expect(screen.queryByText(/Found/)).not.toBeOnTheScreen();
    expect(screen.queryByRole('checkbox', { name: /Hide found places/ })).not.toBeOnTheScreen();
  });
});
