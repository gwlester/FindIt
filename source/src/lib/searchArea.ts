// The compass "search area" view: when the cache is within a set distance, the inner
// circle becomes a small heading-up map showing the search area around the cache.

import type { Units } from './format';

const FEET_PER_METER = 3.28084;

/** Default distance at which the search area replaces the arrow. */
export const DEFAULT_SEARCH_AREA_M = 50;

const RANGES: Record<Units, { min: number; max: number; step: number; unit: string }> = {
  metric: { min: 10, max: 200, step: 5, unit: 'm' },
  imperial: { min: 30, max: 650, step: 10, unit: 'ft' },
};

/** Allowed values for the switch-distance setting, in display units. */
export function searchAreaRange(units: Units) {
  return RANGES[units];
}

/** The stored distance (metres) as shown in the current units, rounded to the step. */
export function toDisplayDistance(meters: number, units: Units): number {
  const { step } = RANGES[units];
  const value = units === 'imperial' ? meters * FEET_PER_METER : meters;
  return Math.round(value / step) * step;
}

/** A value in display units, converted back to metres for storage. */
export function fromDisplayDistance(value: number, units: Units): number {
  return units === 'imperial' ? value / FEET_PER_METER : value;
}

/** One step up (+1) or down (−1) in display units, kept in range; returns metres. */
export function stepSearchDistance(meters: number, units: Units, direction: 1 | -1): number {
  const { min, max, step } = RANGES[units];
  const next = Math.min(max, Math.max(min, toDisplayDistance(meters, units) + direction * step));
  return fromDisplayDistance(next, units);
}

/** Whether the compass should show the search area instead of the arrow. */
export function showSearchArea(distanceM: number | null, switchDistanceM: number | null): boolean {
  return distanceM != null && switchDistanceM != null && distanceM <= switchDistanceM;
}

const SCALES: Record<Units, number[]> = {
  metric: [10, 20, 50, 100, 200, 500, 1000],
  imperial: [50, 100, 200, 500, 1000, 2000, 5000],
};

/**
 * The map scale for the search-area view: the smallest round number (in display units)
 * whose ring holds both the cache and its search circle. `meters` is the radius of the
 * map's outer ring.
 */
export function mapScale(distanceM: number, radiusM: number, units: Units) {
  const needed = units === 'imperial' ? (distanceM + radiusM) * FEET_PER_METER : distanceM + radiusM;
  const scales = SCALES[units];
  const scale = scales.find((s) => s >= needed) ?? scales[scales.length - 1];
  const unit = RANGES[units].unit;
  return { meters: fromDisplayDistance(scale, units), label: `${scale} ${unit}`, halfLabel: `${scale / 2} ${unit}` };
}
