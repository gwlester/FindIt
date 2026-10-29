import { averageFixes, hasMovedAway, isUsableFix, MAX_FIX_ACCURACY_M, type Fix } from '../../src/lib/averaging';
import { distanceMeters } from '../../src/lib/geo';

const TRUTH = { latitude: 30.4352, longitude: -91.1903 };
const M_LAT = 110574;
const M_LON = 111320 * Math.cos((TRUTH.latitude * Math.PI) / 180);

/** Deterministic pseudo-random Gaussian noise. */
function noise(seed: number) {
  let s = seed;
  const rnd = () => (s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
  return () => Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd());
}

/** Simulated stationary GPS: slowly drifting error plus white noise, 1 Hz. */
function simulate(seconds: number, seed = 42): Fix[] {
  const g = noise(seed);
  let dx = 0;
  let dy = 0;
  const fixes: Fix[] = [];
  for (let t = 0; t < seconds; t++) {
    dx = 0.9 * dx + 1.0 * g();
    dy = 0.9 * dy + 1.0 * g();
    fixes.push({
      latitude: TRUTH.latitude + (dy + 1.5 * g()) / M_LAT,
      longitude: TRUTH.longitude + (dx + 1.5 * g()) / M_LON,
      accuracy: 4,
      timestamp: t * 1000,
    });
  }
  return fixes;
}

describe('averageFixes', () => {
  it('returns null with no usable fixes', () => {
    expect(averageFixes([])).toBeNull();
    expect(averageFixes([{ ...TRUTH, accuracy: MAX_FIX_ACCURACY_M + 1, timestamp: 0 }])).toBeNull();
  });

  it('averages to the fix itself for a single fix, with accuracy = that fix', () => {
    const avg = averageFixes([{ ...TRUTH, accuracy: 6, timestamp: 0 }])!;
    expect(avg.latitude).toBeCloseTo(TRUTH.latitude, 10);
    expect(avg.count).toBe(1);
    expect(avg.durationSec).toBe(0);
    expect(avg.spread).toBeCloseTo(0, 9);
    expect(avg.accuracy).toBe(6);
  });

  it('weights better fixes more', () => {
    const avg = averageFixes([
      { latitude: 0, longitude: 0, accuracy: 1, timestamp: 0 },
      { latitude: 0.0001, longitude: 0, accuracy: 10, timestamp: 1000 },
    ])!;
    expect(avg.latitude).toBeLessThan(0.00001);
  });

  it('assumes 20 m for fixes without accuracy and ignores poor fixes', () => {
    const avg = averageFixes([
      { latitude: 0, longitude: 0, accuracy: null, timestamp: 0 },
      { latitude: 1, longitude: 1, accuracy: 99, timestamp: 1000 },
    ])!;
    expect(isUsableFix({ latitude: 0, longitude: 0, accuracy: null, timestamp: 0 })).toBe(true);
    expect(avg.count).toBe(1);
    expect(avg.accuracy).toBe(20);
  });

  it('beats a single fix and stays honest about its accuracy', () => {
    const fixes = simulate(120);
    const avg = averageFixes(fixes)!;
    const singleRms = Math.sqrt(fixes.reduce((s, f) => s + distanceMeters(TRUTH, f) ** 2, 0) / fixes.length);
    const err = distanceMeters(TRUTH, avg);
    expect(avg.count).toBe(120);
    expect(avg.durationSec).toBe(119);
    expect(err).toBeLessThan(singleRms);
    expect(avg.accuracy).toBeGreaterThan(err * 0.5);
    expect(avg.accuracy).toBeLessThan(4);
    expect(avg.spread).toBeGreaterThan(0);
  });

  it('never claims better than a third of the best fix', () => {
    const fixes = Array.from({ length: 600 }, (_, t) => ({ ...TRUTH, accuracy: 3, timestamp: t * 1000 }));
    expect(averageFixes(fixes)!.accuracy).toBeCloseTo(1, 9);
  });

  it('reports the batch-means error when block averages disagree', () => {
    // Two halves 10 m apart, each perfectly steady: only the batch means can see this.
    const fixes = Array.from({ length: 60 }, (_, t) => ({
      latitude: TRUTH.latitude + (t < 30 ? 0 : 10 / M_LAT),
      longitude: TRUTH.longitude,
      accuracy: 1,
      timestamp: t * 1000,
    }));
    expect(averageFixes(fixes)!.accuracy).toBeGreaterThan(2);
  });
});

describe('hasMovedAway', () => {
  const avg = { latitude: 30, longitude: -91, count: 10, durationSec: 10, spread: 1, accuracy: 2 };
  const north = (m: number, accuracy: number | null = 4) => ({
    latitude: 30 + m / 110574,
    longitude: -91,
    accuracy,
    timestamp: 0,
  });

  it('is false for fixes within 3× their accuracy (at least 10 m) of the average', () => {
    expect(hasMovedAway(avg, north(9))).toBe(false);
    expect(hasMovedAway(avg, north(11, 4))).toBe(false); // 3 × 4 = 12 m
  });

  it('is true once a fix is further than that', () => {
    expect(hasMovedAway(avg, north(13, 4))).toBe(true);
    expect(hasMovedAway(avg, north(11, 1))).toBe(true); // 10 m minimum
    expect(hasMovedAway(avg, north(31, null))).toBe(true); // unknown accuracy counts as 10 m
    expect(hasMovedAway(avg, north(29, null))).toBe(false);
  });
});
