import { positionSource } from '../../src/lib/positionSource';

const status = (used: number, inView = 0) => ({ known: 11, inView, used, usedByConstellation: {} });

test.each([
  [null, 'Position source: waiting for satellite status…'],
  [status(0), 'Position source: network or Wi-Fi (no satellites in use yet)'],
  [status(0, 4), 'Position source: network or Wi-Fi (no satellites in use yet; 4 in view)'],
  [status(1), 'Position source: GPS satellites (1 in use)'],
  [status(8), 'Position source: GPS satellites (8 in use)'],
])('positionSource(%j)', (gnss, expected) => {
  expect(positionSource(gnss)).toBe(expected);
});
