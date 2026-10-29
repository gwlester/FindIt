import { detectFormat, exportFileName, FORMATS, parsePlaces, serializePlaces } from '../../src/formats';
import { FormatError, isValidCoordinate } from '../../src/formats/types';

const PLACE = { name: 'A', latitude: 1, longitude: 2, accuracy: null, notes: '', createdAt: null };

describe('detectFormat', () => {
  it.each([
    ['caches.GPX', undefined, '', 'gpx'],
    ['places.geojson', undefined, '', 'geojson'],
    ['places.json', undefined, '', 'geojson'],
    ['download', 'application/gpx+xml', '', 'gpx'],
    ['download', 'text/xml', '', 'gpx'],
    ['download', 'application/geo+json', '', 'geojson'],
    ['download', 'application/octet-stream', '  <?xml version="1.0"?><gpx/>', 'gpx'],
    ['download', undefined, '\n{"type":"Point"}', 'geojson'],
  ] as const)('%s (%s) → %s', (name, mime, content, expected) => {
    expect(detectFormat(name, mime, content)).toBe(expected);
  });

  it('rejects unrecognised files', () => {
    expect(() => detectFormat('notes.txt', 'text/plain', 'hello')).toThrow(FormatError);
  });
});

test('parsePlaces dispatches on the detected format', () => {
  expect(parsePlaces('a.gpx', undefined, serializePlaces([PLACE], 'gpx')).places).toHaveLength(1);
  expect(parsePlaces('a.json', undefined, serializePlaces([PLACE], 'geojson')).format).toBe('geojson');
});

test('serializePlaces defaults the time to now', () => {
  expect(serializePlaces([PLACE], 'gpx')).toContain('<gpx');
});

test('exportFileName and FORMATS', () => {
  const now = new Date(Date.UTC(2026, 9, 29, 12));
  expect(exportFileName('gpx', now)).toBe('findcache-2026-10-29.gpx');
  expect(exportFileName('geojson', now)).toBe('findcache-2026-10-29.geojson');
  expect(exportFileName('gpx')).toMatch(/^findcache-\d{4}-\d{2}-\d{2}\.gpx$/);
  expect(FORMATS.gpx.mimeType).toBe('application/gpx+xml');
  expect(FORMATS.geojson.mimeType).toBe('application/geo+json');
});

test('isValidCoordinate', () => {
  expect(isValidCoordinate(0, 0)).toBe(true);
  expect(isValidCoordinate('0', 0)).toBe(false);
  expect(isValidCoordinate(0, Infinity)).toBe(false);
  expect(isValidCoordinate(-91, 0)).toBe(false);
  expect(isValidCoordinate(0, 181)).toBe(false);
  expect(new FormatError('x').name).toBe('FormatError');
});
