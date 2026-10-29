import { act, render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import PlacesScreen from '../../src/app/index';
import { listPlaces } from '../../src/db/locations';
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
  await user.press(screen.getByRole('button', { name: 'Files' }));
  expect(router.push).toHaveBeenLastCalledWith('/files');
  await user.press(screen.getByRole('button', { name: 'Settings' }));
  expect(router.push).toHaveBeenLastCalledWith('/settings');
});

test('long-press offers edit and delete', async () => {
  const user = userEvent.setup();
  const alert = mockAlert();
  const db = await renderApp(<PlacesScreen />, { places: [place('Oak')] });

  await user.longPress(screen.getByText('Oak'));
  await alert.press('Oak', 'Edit');
  expect(router.push).toHaveBeenLastCalledWith({ pathname: '/place', params: { id: '1' } });

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
