import { render, screen } from '@testing-library/react-native';

import RootLayout from '../../src/app/_layout';
import { setCurrentDb } from '../helpers/expoSqliteMock';
import { flush } from '../helpers/renderApp';
import { createRawTestDb } from '../helpers/testDb';

test('migrates the database, then renders every route', async () => {
  const db = createRawTestDb();
  setCurrentDb(db);
  await render(<RootLayout />);
  await flush();
  for (const name of ['index', 'place', 'compass/[id]', 'share', 'share-history', 'map', 'offline-maps', 'files', 'settings']) {
    expect(screen.getByTestId(`screen-${name}`)).toBeOnTheScreen();
  }
  expect(screen.getByText('title:Import / Export')).toBeOnTheScreen();
  expect(await db.getFirstAsync('PRAGMA user_version')).toEqual({ user_version: 3 });
});
