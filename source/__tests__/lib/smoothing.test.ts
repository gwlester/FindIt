import { distanceMeters } from '../../src/lib/geo';
import { smoothAngle, smoothPosition } from '../../src/lib/smoothing';

describe('smoothAngle', () => {
  it('starts at the first reading', () => {
    expect(smoothAngle(null, 42)).toBe(42);
  });
  it('moves a quarter of the way, across north correctly', () => {
    expect(smoothAngle(350, 10)).toBeCloseTo(355, 9);
    expect(smoothAngle(10, 350)).toBeCloseTo(5, 9);
    expect(smoothAngle(0, 90)).toBeCloseTo(22.5, 9);
  });
  it('converges', () => {
    let h: number | null = 0;
    for (let i = 0; i < 80; i++) h = smoothAngle(h, 270);
    expect(h).toBeCloseTo(270, 2);
  });
});

describe('smoothPosition', () => {
  const p0 = { latitude: 30, longitude: -91, accuracy: 5, timestamp: 0 };
  const north = (m: number, t: number, accuracy: number | null = 5) => ({
    latitude: 30 + m / 110574,
    longitude: -91,
    accuracy,
    timestamp: t,
  });

  it('returns the first fix unchanged', () => {
    expect(smoothPosition(null, p0)).toBe(p0);
  });
  it('moves 35% of the way to a nearby fix and keeps its accuracy/time', () => {
    const next = smoothPosition(p0, north(10, 1000));
    expect(distanceMeters(p0, next)).toBeCloseTo(3.5, 1);
    expect(next.timestamp).toBe(1000);
    expect(next.accuracy).toBe(5);
  });
  it('resets after a jump larger than 3× accuracy', () => {
    const far = north(100, 1000);
    expect(smoothPosition(p0, far)).toBe(far);
  });
  it('uses a 10 m minimum accuracy (also when unknown) for the jump test', () => {
    expect(smoothPosition(p0, north(25, 1000, 1))).not.toEqual(north(25, 1000, 1));
    expect(smoothPosition(p0, north(25, 1000, null))).not.toEqual(north(25, 1000, null));
  });
  it('resets after a gap of more than 10 s', () => {
    const late = north(5, 20_000);
    expect(smoothPosition(p0, late)).toBe(late);
  });
});
