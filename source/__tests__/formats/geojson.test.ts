import { parseGeoJson, toGeoJson } from '../../src/formats/geojson';
import { FormatError } from '../../src/formats/types';

const PLACES = [
  { name: 'Oak', latitude: 30.4352, longitude: -91.1903, accuracy: 2.1, notes: 'roots', createdAt: Date.UTC(2026, 9, 28) },
  { name: 'Bare', latitude: 1, longitude: 2, accuracy: null, notes: '', createdAt: null },
];

test('toGeoJson writes Point features with longitude first, and round-trips', () => {
  const json = toGeoJson(PLACES);
  const data = JSON.parse(json);
  expect(data.type).toBe('FeatureCollection');
  expect(data.features[0].geometry).toEqual({ type: 'Point', coordinates: [-91.1903, 30.4352] });
  expect(data.features[0].properties).toEqual({
    name: 'Oak',
    notes: 'roots',
    accuracy: 2.1,
    createdAt: '2026-10-28T00:00:00.000Z',
  });
  expect(data.features[1].properties.createdAt).toBeNull();
  expect(parseGeoJson(json)).toEqual({
    format: 'geojson',
    places: PLACES.map((p) => ({ ...p, finds: [] })),
    skipped: 0,
  });
});

describe('parseGeoJson', () => {
  it('accepts a single Feature and a bare Point', () => {
    expect(
      parseGeoJson('{"type":"Feature","geometry":{"type":"Point","coordinates":[2,1,99]},"properties":{"title":"T"}}')
        .places[0],
    ).toMatchObject({ name: 'T', latitude: 1, longitude: 2 });
    expect(parseGeoJson('{"type":"Point","coordinates":[2,1]}').places[0].name).toBe('Point 1');
  });

  it('reads alternative property names and ignores bad values', () => {
    const fc = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [2, 1] },
          properties: { Name: ' N ', description: 'd', accuracy: -1, createdAt: 'nope' },
        },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [2, 1] }, properties: { name: '  ', desc: 'x', accuracy: '5' } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [2, 1] }, properties: null },
      ],
    };
    const { places } = parseGeoJson(JSON.stringify(fc));
    expect(places.map((p) => [p.name, p.notes, p.accuracy, p.createdAt])).toEqual([
      ['N', 'd', null, null],
      ['Point 2', 'x', null, null],
      ['Point 3', '', null, null],
    ]);
  });

  it('skips non-point and invalid features', () => {
    const fc = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [200, 0] } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: 'x' } },
        { type: 'Feature', geometry: null },
        'junk',
        [1, 2],
        { type: 'Feature', geometry: { type: 'Point', coordinates: [2, 1] }, properties: { name: 'ok' } },
      ],
    };
    const result = parseGeoJson(JSON.stringify(fc));
    expect(result.places.map((p) => p.name)).toEqual(['ok']);
    expect(result.skipped).toBe(6);
  });

  it('rejects non-GeoJSON', () => {
    expect(() => parseGeoJson('not json')).toThrow(/Not a valid GeoJSON file/);
    expect(() => parseGeoJson('[1,2]')).toThrow(FormatError);
    expect(() => parseGeoJson('{"type":"FeatureCollection"}')).toThrow('Not a GeoJSON file');
    expect(() => parseGeoJson('null')).toThrow('Not a GeoJSON file');
  });

  it('reports non-Error JSON failures', () => {
    const spy = jest.spyOn(JSON, 'parse').mockImplementationOnce(() => {
      throw 'odd';
    });
    expect(() => parseGeoJson('{}')).toThrow('Not a valid GeoJSON file: odd');
    spy.mockRestore();
  });
});
