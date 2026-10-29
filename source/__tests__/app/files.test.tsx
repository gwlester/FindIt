import { screen, userEvent } from '@testing-library/react-native';

import FilesScreen from '../../src/app/files';
import { listPlaces } from '../../src/db/locations';
import { pickImportFile, shareExport } from '../../src/formats/files';
import { mockAlert, place, renderApp } from '../helpers/renderApp';

jest.mock('../../src/formats/files', () => ({ pickImportFile: jest.fn(), shareExport: jest.fn() }));

const IMPORTED = {
  fileName: 'caches.gpx',
  format: 'gpx' as const,
  skipped: 2,
  places: [
    { name: 'Creek', latitude: 30.42, longitude: -91.15, accuracy: null, notes: '', createdAt: null },
    { name: 'Oak', latitude: 30.4352, longitude: -91.1903, accuracy: 4, notes: '', createdAt: null },
    { name: 'Tower', latitude: 30.45, longitude: -91.2, accuracy: null, notes: '', createdAt: null },
  ],
};

test('exports the selected places in the chosen format', async () => {
  const user = userEvent.setup();
  const alert = mockAlert();
  await renderApp(<FilesScreen />, { places: [place('Oak'), place('Elm')] });
  await user.press(screen.getByRole('checkbox', { name: /Elm/ }));
  await user.press(screen.getByRole('button', { name: 'Export 1 place…' }));
  expect(alert.message('Export 1 place')).toBe('Which format?');
  await alert.press('Export 1 place', 'GPX: GPS units and geocaching apps');
  expect(shareExport).toHaveBeenLastCalledWith([expect.objectContaining({ name: 'Oak' })], 'gpx');

  await user.press(screen.getByRole('checkbox', { name: /Elm/ }));
  await user.press(screen.getByRole('button', { name: 'Export 2 places…' }));
  await alert.press('Export 2 places', 'GeoJSON: mapping tools');
  expect(jest.mocked(shareExport).mock.calls[1][1]).toBe('geojson');
  expect(jest.mocked(shareExport).mock.calls[1][0]).toHaveLength(2);
});

test('reports export failures', async () => {
  const user = userEvent.setup();
  const alert = mockAlert();
  await renderApp(<FilesScreen />, { places: [place('Oak')] });
  jest.mocked(shareExport).mockRejectedValueOnce(new Error('No sharing')).mockRejectedValueOnce('odd');
  await user.press(screen.getByRole('button', { name: 'Export 1 place…' }));
  await alert.press('Export 1 place', 'GPX: GPS units and geocaching apps');
  expect(alert.message('Export failed')).toBe('No sharing');
  await alert.press('Export 1 place', 'GeoJSON: mapping tools');
  expect(alert.message('Export failed')).toBe('odd');
});

test('with no places, export is disabled', async () => {
  await renderApp(<FilesScreen />);
  expect(screen.getByText('You have no places to export yet.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Export 0 places…' })).toBeDisabled();
});

test('imports chosen places from a picked file, skipping ones already saved', async () => {
  const user = userEvent.setup();
  const alert = mockAlert();
  const db = await renderApp(<FilesScreen />, { places: [place('Oak')] });
  jest.mocked(pickImportFile).mockResolvedValueOnce(IMPORTED);
  await user.press(screen.getByRole('button', { name: 'Choose a file…' }));
  expect(screen.getByText('Import from caches.gpx')).toBeOnTheScreen();
  expect(screen.getByText('GPX · 3 places · 2 other items skipped')).toBeOnTheScreen();
  await user.press(screen.getByRole('checkbox', { name: /Tower/ }));
  await user.press(screen.getByRole('button', { name: 'Import selected' }));
  expect(alert.message('Imported')).toBe('Added 1 place, skipped 1 already saved.');
  const names = (await listPlaces(db as never)).map((p) => [p.name, p.source]);
  expect(names).toEqual([
    ['Creek', 'caches.gpx'],
    ['Oak', 'local'],
  ]);
  expect(screen.getByRole('button', { name: 'Export 2 places…' })).toBeOnTheScreen();
});

test('import: cancel, nothing usable, errors, and deselecting everything', async () => {
  const user = userEvent.setup();
  const alert = mockAlert();
  await renderApp(<FilesScreen />);
  jest.mocked(pickImportFile).mockResolvedValueOnce(null);
  await user.press(screen.getByRole('button', { name: 'Choose a file…' }));
  expect(alert.spy).not.toHaveBeenCalled();

  jest.mocked(pickImportFile).mockResolvedValueOnce({ ...IMPORTED, places: [] });
  await user.press(screen.getByRole('button', { name: 'Choose a file…' }));
  expect(alert.message('Nothing to import')).toBe('No usable places found in caches.gpx.');

  jest.mocked(pickImportFile).mockRejectedValueOnce(new Error('Unrecognised file')).mockRejectedValueOnce('odd');
  await user.press(screen.getByRole('button', { name: 'Choose a file…' }));
  expect(alert.message('Import failed')).toBe('Unrecognised file');
  await user.press(screen.getByRole('button', { name: 'Choose a file…' }));
  expect(alert.message('Import failed')).toBe('odd');

  jest.mocked(pickImportFile).mockResolvedValueOnce({ ...IMPORTED, format: 'geojson', skipped: 1, places: IMPORTED.places.slice(0, 1) });
  await user.press(screen.getByRole('button', { name: 'Choose a file…' }));
  expect(screen.getByText('GeoJSON · 1 place · 1 other item skipped')).toBeOnTheScreen();
  await user.press(screen.getByRole('checkbox', { name: /Creek/ }));
  expect(screen.getByRole('button', { name: 'Import selected' })).toBeDisabled();
  await user.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByRole('button', { name: 'Choose a file…' })).toBeOnTheScreen();

  jest.mocked(pickImportFile).mockResolvedValueOnce({ ...IMPORTED, skipped: 0, places: IMPORTED.places.slice(0, 1) });
  await user.press(screen.getByRole('button', { name: 'Choose a file…' }));
  expect(screen.getByText('GPX · 1 place')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Import selected' }));
  expect(alert.message('Imported')).toBe('Added 1 place.');
});
