import { likelyInUsgsCoverage, mapStyleFor, SATELLITE_STYLE, STREETS_STYLE_URL } from '../../src/lib/mapSources';

test('streets use the free OpenFreeMap (OpenStreetMap) style', () => {
  expect(STREETS_STYLE_URL).toBe('https://tiles.openfreemap.org/styles/liberty');
  expect(mapStyleFor('streets')).toBe(STREETS_STYLE_URL);
});

test('satellite is USGS public-domain imagery as a raster style', () => {
  expect(mapStyleFor('satellite')).toBe(SATELLITE_STYLE);
  const source = Object.values(SATELLITE_STYLE.sources)[0];
  expect(source).toMatchObject({
    type: 'raster',
    tiles: ['https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}'],
    tileSize: 256,
    maxzoom: 16,
  });
  expect((source as { attribution: string }).attribution).toMatch(/USGS/);
  expect(SATELLITE_STYLE.layers).toEqual([expect.objectContaining({ type: 'raster' })]);
});

test.each([
  ['Baton Rouge', 30.45, -91.19, true],
  ['Anchorage', 61.22, -149.9, true],
  ['Honolulu', 21.31, -157.86, true],
  ['San Juan', 18.47, -66.11, true],
  ['London', 51.5, -0.12, false],
  ['Sydney', -33.87, 151.21, false],
  ['Mexico City', 19.43, -99.13, false],
])('satellite coverage (roughly the US): %s', (_name, lat, lon, inside) => {
  expect(likelyInUsgsCoverage(lat, lon)).toBe(inside);
});
