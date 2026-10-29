import { formatCoordinate, formatDistance, formatLatLon } from '../../src/lib/format';

describe('formatDistance', () => {
  it.each([
    [0, 'metric', '0 m'],
    [999.4, 'metric', '999 m'],
    [1234, 'metric', '1.23 km'],
    [12345, 'metric', '12.3 km'],
    [100, 'imperial', '328 ft'],
    [500, 'imperial', '0.31 mi'],
    [20000, 'imperial', '12.4 mi'],
  ] as const)('%d m in %s is %s', (meters, units, expected) => {
    expect(formatDistance(meters, units)).toBe(expected);
  });
});

test('formatCoordinate and formatLatLon', () => {
  expect(formatCoordinate(30.43520123, 'N', 'S')).toBe('30.43520° N');
  expect(formatCoordinate(-1.5, 'N', 'S')).toBe('1.50000° S');
  expect(formatLatLon(30.4352, -91.1903)).toBe('30.43520° N, 91.19030° W');
  expect(formatLatLon(-33.9, 151.2)).toBe('33.90000° S, 151.20000° E');
});
