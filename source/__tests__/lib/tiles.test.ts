import { MAX_DOWNLOAD_TILES, OFFLINE_ZOOMS, tileCount } from '../../src/lib/tiles';

test('counts the web-mercator tiles covering an area over a zoom range', () => {
  expect(tileCount([-180, -85, 180, 85], 0, 0)).toBe(1);
  expect(tileCount([-180, -85, 180, 85], 0, 2)).toBe(1 + 4 + 16);
  // A small area is one tile at low zoom and several at street level.
  expect(tileCount([-91.2, 30.4, -91.1, 30.5], 0, 0)).toBe(1);
  expect(tileCount([-91.2, 30.4, -91.1, 30.5], 14, 14)).toBe(5 * 6);
});

test('download zoom ranges and the size limit', () => {
  expect(OFFLINE_ZOOMS).toEqual({ streets: { min: 10, max: 14 }, satellite: { min: 10, max: 16 } });
  expect(MAX_DOWNLOAD_TILES).toBe(6000);
});
