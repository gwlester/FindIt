import {
  bearingDegrees,
  combinedUncertainty,
  compassPoint,
  distanceMeters,
  isValidLatitude,
  isValidLongitude,
  normalizeDegrees,
  parseCoordinate,
} from '../../src/lib/geo';

const BATON_ROUGE = { latitude: 30.4515, longitude: -91.1871 };
const NEW_ORLEANS = { latitude: 29.9511, longitude: -90.0715 };

describe('distanceMeters', () => {
  it('is zero for the same point', () => {
    expect(distanceMeters(BATON_ROUGE, BATON_ROUGE)).toBe(0);
  });
  it('matches a known distance', () => {
    expect(distanceMeters(BATON_ROUGE, NEW_ORLEANS) / 1000).toBeCloseTo(120.8, 0);
  });
  it('is about 111.2 km per degree of latitude', () => {
    expect(distanceMeters({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 })).toBeCloseTo(111195, -1);
  });
});

describe('bearingDegrees', () => {
  it.each([
    [{ latitude: 0, longitude: 1 }, 90],
    [{ latitude: -1, longitude: 0 }, 180],
    [{ latitude: 0, longitude: -1 }, 270],
    [{ latitude: 1, longitude: 0 }, 0],
  ])('from the origin to %j is %d°', (to, expected) => {
    expect(bearingDegrees({ latitude: 0, longitude: 0 }, to)).toBeCloseTo(expected, 9);
  });
  it('Baton Rouge → New Orleans is south-east', () => {
    expect(bearingDegrees(BATON_ROUGE, NEW_ORLEANS)).toBeCloseTo(117.1, 0);
  });
});

test('normalizeDegrees', () => {
  expect(normalizeDegrees(-90)).toBe(270);
  expect(normalizeDegrees(720 + 5)).toBe(5);
  expect(normalizeDegrees(0)).toBe(0);
});

test('combinedUncertainty', () => {
  expect(combinedUncertainty(3, 4)).toBe(5);
  expect(combinedUncertainty(3, null)).toBe(3);
  expect(combinedUncertainty(null, 4)).toBe(4);
  expect(combinedUncertainty(null, null)).toBeNull();
});

test('compassPoint', () => {
  expect(compassPoint(0)).toBe('N');
  expect(compassPoint(359)).toBe('N');
  expect(compassPoint(44)).toBe('NE');
  expect(compassPoint(225)).toBe('SW');
  expect(compassPoint(-90)).toBe('W');
});

test('isValidLatitude / isValidLongitude', () => {
  expect(isValidLatitude(90)).toBe(true);
  expect(isValidLatitude(-90.1)).toBe(false);
  expect(isValidLatitude(NaN)).toBe(false);
  expect(isValidLongitude(-180)).toBe(true);
  expect(isValidLongitude(180.5)).toBe(false);
});

describe('parseCoordinate', () => {
  it.each([
    ['30.4352', 'lat', 30.4352],
    ['-91.1903', 'lon', -91.1903],
    ['N 30° 26.112', 'lat', 30.4352],
    ['S 30 26.112', 'lat', -30.4352],
    ['W 091° 11.418', 'lon', -91.1903],
    [`91°11'25.08"W`, 'lon', -91.1903],
    ['91 11 25.08 E', 'lon', 91.1903],
    ['  n30.5  ', 'lat', 30.5],
    ['W -10', 'lon', 10],
  ] as const)('parses %s', (text, axis, expected) => {
    expect(parseCoordinate(text, axis)).toBeCloseTo(expected, 6);
  });

  it.each([
    ['', 'lat'],
    ['   ', 'lat'],
    ['abc', 'lat'],
    ['E 30', 'lat'],
    ['95', 'lat'],
    ['181', 'lon'],
    ['30 61', 'lat'],
    ['30 10 60', 'lat'],
    ['1 2 3 4', 'lat'],
    ['°', 'lat'],
    ['1..2', 'lat'],
  ] as const)('rejects %j', (text, axis) => {
    expect(parseCoordinate(text, axis)).toBeNull();
  });
});
