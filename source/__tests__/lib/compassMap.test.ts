import { compassMapLayer, zoomForScale } from '../../src/lib/compassMap';

test('picks the zoom at which the scale distance spans the map radius', () => {
  // MapLibre: the world is 512 dp wide at zoom 0. 50 m over 100 dp = 0.5 m/dp at the equator.
  expect(zoomForScale(50, 100, 0)).toBeCloseTo(Math.log2(40_075_016.686 / (512 * 0.5)), 6);
  // Further from the equator a metre is more pixels, so one zoom level less at 60°.
  expect(zoomForScale(50, 100, 60)).toBeCloseTo(zoomForScale(50, 100, 0) - 1, 6);
  // Twice the distance: one level out.
  expect(zoomForScale(100, 100, 30)).toBeCloseTo(zoomForScale(50, 100, 30) - 1, 6);
});

test('which map goes behind the search area: none, streets, or satellite where USGS covers', () => {
  expect(compassMapLayer('plain', 30.4, -91.2)).toBeNull();
  expect(compassMapLayer('streets', 51.5, -0.1)).toBe('streets');
  expect(compassMapLayer('satellite', 30.4, -91.2)).toBe('satellite');
  expect(compassMapLayer('satellite', 51.5, -0.1)).toBe('streets');
});
