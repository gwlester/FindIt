// Display smoothing for the compass screen. It steadies the numbers and the
// rose; it doesn't make the underlying fix any more accurate.

import { distanceMeters } from './geo';

type Fix = { latitude: number; longitude: number; accuracy: number | null; timestamp: number };

/** Weight of each new fix when smoothing (0–1); lower is smoother but lags more. */
const POSITION_SMOOTHING = 0.35;

/**
 * Exponential smoothing of a fix stream. Starts over after a gap or a jump much larger
 * than the reported accuracy, so it never lags far behind real movement.
 */
export function smoothPosition<T extends Fix>(previous: T | null, fix: T): T {
  if (!previous || fix.timestamp - previous.timestamp > 10_000) return fix;
  const tolerance = 3 * Math.max(fix.accuracy ?? 10, 10);
  if (distanceMeters(previous, fix) > tolerance) return fix;
  return {
    ...fix,
    latitude: previous.latitude + POSITION_SMOOTHING * (fix.latitude - previous.latitude),
    longitude: previous.longitude + POSITION_SMOOTHING * (fix.longitude - previous.longitude),
  };
}

/** Weight of each new compass reading (0–1); lower is steadier but slower to follow. */
const HEADING_SMOOTHING = 0.25;

/** Exponential smoothing on a circle: 359° and 1° average to 0°, not 180°. */
export function smoothAngle(previous: number | null, next: number): number {
  if (previous == null) return next;
  const delta = ((next - previous + 540) % 360) - 180;
  return (previous + HEADING_SMOOTHING * delta + 360) % 360;
}
