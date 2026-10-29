import { screen, userEvent } from '@testing-library/react-native';

import FilesScreen from '../../src/app/files';
import { listFinds, recordFind } from '../../src/db/finds';
import { listPlaces } from '../../src/db/locations';
import { DEFAULT_SETTINGS } from '../../src/db/settings';
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

describe('found information', () => {
  async function renderWithFind(settings = DEFAULT_SETTINGS) {
    const db = await renderApp(<FilesScreen />, { places: [place('Oak'), place('Elm')], settings });
    await recordFind(db as never, 1, { foundAt: 1000, comment: 'easy' }, 'log');
    return db;
  }

  it('asks whether to include it when exporting found places', async () => {
    const user = userEvent.setup();
    const alert = mockAlert();
    await renderWithFind();
    await user.press(screen.getByRole('button', { name: 'Export 2 places…' }));
    await alert.press('Export 2 places', 'GPX: GPS units and geocaching apps');
    expect(alert.message('Include found information?')).toMatch(/dates and comments/);
    await alert.press('Include found information?', 'Include');
    const exported = jest.mocked(shareExport).mock.calls[0][0];
    expect(exported.find((p) => p.name === 'Oak')!.finds).toEqual([{ foundAt: 1000, comment: 'easy', finder: '' }]);

    await user.press(screen.getByRole('button', { name: 'Export 2 places…' }));
    await alert.press('Export 2 places', 'GeoJSON: mapping tools');
    await alert.press('Include found information?', 'Leave out');
    expect(jest.mocked(shareExport).mock.calls[1][0].every((p) => p.finds === undefined)).toBe(true);
  });

  it('does not ask when nothing selected was found, or when marking found is off', async () => {
    const user = userEvent.setup();
    const alert = mockAlert();
    await renderWithFind();
    await user.press(screen.getByRole('checkbox', { name: /Oak/ }));
    await user.press(screen.getByRole('button', { name: 'Export 1 place…' }));
    await alert.press('Export 1 place', 'GPX: GPS units and geocaching apps');
    expect(alert.spy.mock.calls.some((c) => c[0] === 'Include found information?')).toBe(false);
    expect(shareExport).toHaveBeenCalledTimes(1);
    await screen.unmount();

    await renderWithFind({ ...DEFAULT_SETTINGS, findMode: 'off' });
    await user.press(screen.getByRole('button', { name: 'Export 2 places…' }));
    await alert.press('Export 2 places', 'GPX: GPS units and geocaching apps');
    expect(alert.spy.mock.calls.some((c) => c[0] === 'Include found information?')).toBe(false);
  });

  it('imports finds from a file as mine', async () => {
    const user = userEvent.setup();
    mockAlert();
    const db = await renderApp(<FilesScreen />);
    jest.mocked(pickImportFile).mockResolvedValueOnce({
      ...IMPORTED,
      places: [{ ...IMPORTED.places[0], finds: [{ foundAt: 2000, comment: 'c', finder: '' }] }],
    });
    await user.press(screen.getByRole('button', { name: 'Choose a file…' }));
    await user.press(screen.getByRole('button', { name: 'Import selected' }));
    expect((await listFinds(db as never, 1)).map((f) => [f.foundAt, f.finder])).toEqual([[2000, '']]);
  });
});
