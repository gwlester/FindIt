// Position averaging: combine many GPS fixes taken while standing still into one
// better estimate (the classic geocacher technique for recording coordinates).

import { distanceMeters } from './geo';

export type Fix = {
  latitude: number;
  longitude: number;
  /** Reported horizontal accuracy (m), if any. */
  accuracy: number | null;
  /** ms since epoch */
  timestamp: number;
};

export type Average = {
  latitude: number;
  longitude: number;
  /** Fixes used. */
  count: number;
  /** Seconds between the first and last fix used. */
  durationSec: number;
  /** RMS distance of the fixes from the average (m): how much they wander. */
  spread: number;
  /** Estimated accuracy of the average (m), comparable to a single fix's accuracy. */
  accuracy: number;
};

/** Fixes worse than this are ignored; they would only drag the average around. */
export const MAX_FIX_ACCURACY_M = 30;
/** Accuracy assumed for fixes that don't report one. */
const DEFAULT_ACCURACY_M = 20;
/**
 * GPS errors drift over tens of seconds, so consecutive fixes are far from independent.
 * Count at most one independent sample per this many seconds.
 */
const CORRELATION_SEC = 45;
/** Number of blocks for the batch-means check (needs at least MIN_BLOCK_FIXES per block). */
const BLOCKS = 6;
const MIN_BLOCK_FIXES = 5;
const M_PER_DEG_LAT = 110_574;
const M_PER_DEG_LON_EQUATOR = 111_320;

export function isUsableFix(fix: Fix): boolean {
  return fix.accuracy == null || fix.accuracy <= MAX_FIX_ACCURACY_M;
}

/**
 * Inverse-variance weighted mean of the usable fixes (better fixes count more).
 *
 * The accuracy estimate is deliberately conservative, the largest of:
 *  - the typical fix accuracy (or the observed spread, if larger) divided by
 *    √(independent samples), counting one sample per CORRELATION_SEC;
 *  - a batch-means estimate: split the fixes into blocks in time order and measure how
 *    much the block averages disagree. This catches slow drift directly;
 *  - a third of the best single fix, because averaging can't remove systematic errors
 *    such as multipath.
 * Tuned with simulated drifting GPS errors so the true error is within the reported
 * accuracy most of the time, as with a single fix's accuracy.
 */
export function averageFixes(fixes: Fix[]): Average | null {
  const used = fixes.filter(isUsableFix);
  if (used.length === 0) return null;

  let wSum = 0;
  let lat = 0;
  let lon = 0;
  let bestAccuracy = Infinity;
  for (const f of used) {
    const acc = Math.max(f.accuracy ?? DEFAULT_ACCURACY_M, 1);
    const w = 1 / (acc * acc);
    wSum += w;
    lat += w * f.latitude;
    lon += w * f.longitude;
    bestAccuracy = Math.min(bestAccuracy, acc);
  }
  lat /= wSum;
  lon /= wSum;

  const mPerDegLon = M_PER_DEG_LON_EQUATOR * Math.cos((lat * Math.PI) / 180);
  const offsets = used.map((f) => ({
    dx: (f.longitude - lon) * mPerDegLon,
    dy: (f.latitude - lat) * M_PER_DEG_LAT,
  }));
  let sq = 0;
  offsets.forEach(({ dx, dy }, i) => {
    const acc = Math.max(used[i].accuracy ?? DEFAULT_ACCURACY_M, 1);
    sq += (dx * dx + dy * dy) / (acc * acc);
  });
  const spread = Math.sqrt(sq / wSum);

  const times = used.map((f) => f.timestamp);
  const durationSec = (Math.max(...times) - Math.min(...times)) / 1000;
  const typicalAccuracy = Math.sqrt(used.length / wSum);
  const independent = Math.min(used.length, Math.max(1, durationSec / CORRELATION_SEC));

  // Batch means: standard error of the mean from the scatter of block averages.
  let batchError = 0;
  const blocks = Math.min(BLOCKS, Math.floor(used.length / MIN_BLOCK_FIXES));
  if (blocks >= 2) {
    let blockSq = 0;
    for (let b = 0; b < blocks; b++) {
      const part = offsets.slice(Math.floor((b * offsets.length) / blocks), Math.floor(((b + 1) * offsets.length) / blocks));
      const mx = part.reduce((sum, o) => sum + o.dx, 0) / part.length;
      const my = part.reduce((sum, o) => sum + o.dy, 0) / part.length;
      blockSq += mx * mx + my * my;
    }
    batchError = Math.sqrt(blockSq / (blocks * (blocks - 1)));
  }

  const accuracy = Math.max(
    Math.max(typicalAccuracy, spread) / Math.sqrt(independent),
    batchError,
    bestAccuracy / 3,
  );

  return { latitude: lat, longitude: lon, count: used.length, durationSec, spread, accuracy };
}

/**
 * True when a new fix is too far from the average to be the same spot: further than
 * 3× its accuracy (at least 10 m; unknown accuracy counts as 10 m). Used to stop
 * averaging automatically when the user walks away.
 */
export function hasMovedAway(average: Pick<Average, 'latitude' | 'longitude'>, fix: Fix): boolean {
  return distanceMeters(average, fix) > Math.max(3 * (fix.accuracy ?? 10), 10);
}
