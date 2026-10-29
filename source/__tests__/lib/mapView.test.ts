import { initialView } from '../../src/lib/mapView';

const p = (latitude: number, longitude: number) => ({ latitude, longitude });

test('nothing to show: no initial view (the camera follows you instead)', () => {
  expect(initialView([])).toBeNull();
});

test('one point: centred at street level', () => {
  expect(initialView([p(30.4, -91.1)])).toEqual({ center: [-91.1, 30.4], zoom: 16 });
});

test('several points: their bounds, padded, as [west, south, east, north]', () => {
  const view = initialView([p(30, -91), p(31, -90)]);
  expect(view).toEqual({ bounds: [-91.1, 29.9, -89.9, 31.1] });
});

test('points very close together still get a sensible area', () => {
  const view = initialView([p(30, -91), p(30.0001, -91.0001)]) as { bounds: number[] };
  expect(view.bounds[2] - view.bounds[0]).toBeGreaterThanOrEqual(0.005);
  expect(view.bounds[3] - view.bounds[1]).toBeGreaterThanOrEqual(0.005);
});
