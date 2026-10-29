import { decodeItem, encodeItem } from '../../src/ble/protocol';
import { parseGeoJson, toGeoJson } from '../../src/formats/geojson';
import { parseGpx, toGpx } from '../../src/formats/gpx';

const FINDS = [
  { foundAt: Date.UTC(2026, 9, 29, 10), comment: 'Easy & dry', finder: '' },
  { foundAt: Date.UTC(2026, 9, 20, 9), comment: '', finder: 'Alex' },
];
const PLACE = { name: 'Oak', latitude: 30.4352, longitude: -91.1903, accuracy: 3, notes: 'roots', createdAt: null };

describe('GPX', () => {
  it('marks found places as "Geocache Found" and round-trips the finds', () => {
    const xml = toGpx([{ ...PLACE, finds: FINDS }, { ...PLACE, name: 'Elm' }]);
    expect(xml).toContain('<sym>Geocache Found</sym>');
    expect(xml).toContain('<findit:find time="2026-10-29T10:00:00.000Z">');
    expect(xml).toContain('<findit:comment>Easy &amp; dry</findit:comment>');
    expect(xml).toContain('<findit:finder>Alex</findit:finder>');
    const [oak, elm] = parseGpx(xml).places;
    expect(oak.finds).toEqual(FINDS);
    expect(elm.finds).toEqual([]);
    expect(xml.split('<sym>Geocache</sym>')).toHaveLength(2); // Elm is not found
  });

  it('treats a "Geocache Found" waypoint from another app as one find of mine', () => {
    const xml = `<gpx><wpt lat="1" lon="2"><time>2020-01-02T00:00:00Z</time><name>GC1</name><sym>Geocache Found</sym></wpt>
      <wpt lat="1" lon="2"><name>GC2</name><sym>Geocache Found</sym></wpt></gpx>`;
    const [a, b] = parseGpx(xml).places;
    expect(a.finds).toEqual([{ foundAt: Date.UTC(2020, 0, 2), comment: '', finder: '' }]);
    expect(b.finds).toHaveLength(1);
    expect(b.finds![0].foundAt).toBeGreaterThan(0);
  });

  it('ignores FindIt finds with bad times', () => {
    const xml = `<gpx><wpt lat="1" lon="2"><name>A</name><extensions>
      <find time="nope"><comment>x</comment></find><find time="2026-01-01T00:00:00Z"/></extensions></wpt></gpx>`;
    expect(parseGpx(xml).places[0].finds).toEqual([{ foundAt: Date.UTC(2026, 0, 1), comment: '', finder: '' }]);
  });
});

describe('GeoJSON', () => {
  it('round-trips finds as a list', () => {
    const json = toGeoJson([{ ...PLACE, finds: FINDS }]);
    expect(JSON.parse(json).features[0].properties.finds[0]).toEqual({
      foundAt: '2026-10-29T10:00:00.000Z',
      comment: 'Easy & dry',
      finder: '',
    });
    expect(parseGeoJson(json).places[0].finds).toEqual(FINDS);
  });

  it('skips malformed finds', () => {
    const json = JSON.stringify({
      type: 'Point',
      coordinates: [2, 1],
    });
    expect(parseGeoJson(json).places[0].finds).toEqual([]);
    const fc = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [2, 1] },
      properties: { finds: [{ foundAt: 'bad' }, 'x', { foundAt: '2026-01-01T00:00:00Z', comment: 5, finder: 'Jo' }] },
    };
    expect(parseGeoJson(JSON.stringify(fc)).places[0].finds).toEqual([
      { foundAt: Date.UTC(2026, 0, 1), comment: '', finder: 'Jo' },
    ]);
  });
});

describe('Bluetooth items', () => {
  const shared = { name: 'Oak', latitude: 1, longitude: 2, accuracy: null, notes: '' };

  it('carry finds', () => {
    expect(decodeItem(encodeItem({ ...shared, finds: FINDS })).finds).toEqual(FINDS);
    expect(decodeItem(encodeItem(shared)).finds).toEqual([]);
  });

  it('drop the oldest finds first to fit, before trimming notes', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ foundAt: i * 1000, comment: 'c'.repeat(20), finder: '' }));
    const decoded = decodeItem(encodeItem({ ...shared, notes: 'n'.repeat(100), finds: many }));
    expect(Buffer.byteLength(encodeItem({ ...shared, notes: 'n'.repeat(100), finds: many }))).toBeLessThanOrEqual(500);
    expect(decoded.notes).toBe('n'.repeat(100));
    expect(decoded.finds!.length).toBeGreaterThan(0);
    expect(decoded.finds![0].foundAt).toBe(29000); // newest kept
  });

  it('tolerate malformed finds', () => {
    expect(decodeItem('{"n":"A","la":1,"lo":2,"f":[[1,"c"],["x"],5]}').finds).toEqual([
      { foundAt: 1, comment: 'c', finder: '' },
    ]);
  });
});
