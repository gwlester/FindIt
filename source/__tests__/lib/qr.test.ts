import { qrModules } from '../../src/lib/qr';

const SAMPLE = 'https://github.com/gwlester/findit/releases/latest/download/findcache.apk';

test('encodes text as a square grid of dark and light modules', () => {
  const m = qrModules(SAMPLE);
  expect(m.length).toBeGreaterThanOrEqual(21);
  expect(m.every((row) => row.length === m.length)).toBe(true);
});

test('has the three finder patterns in the corners', () => {
  const m = qrModules(SAMPLE);
  const n = m.length;
  // A finder pattern is a dark 7x7 ring around a dark 3x3 centre, with a light ring between.
  const finder = (r: number, c: number) =>
    m[r][c] && m[r + 6][c + 6] && m[r][c + 6] && m[r + 6][c] && m[r + 3][c + 3] && !m[r + 1][c + 1] && !m[r + 5][c + 5];
  expect(finder(0, 0)).toBe(true);
  expect(finder(0, n - 7)).toBe(true);
  expect(finder(n - 7, 0)).toBe(true);
});

test('different text gives a different code', () => {
  expect(qrModules('a')).not.toEqual(qrModules('b'));
});
