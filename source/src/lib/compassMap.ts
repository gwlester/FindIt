// The optional map behind the compass's search-area view.

import { likelyInUsgsCoverage, type MapLayer } from './mapSources';

export type CompassBackground = 'plain' | MapLayer;

const EARTH_CIRCUMFERENCE_M = 40_075_016.686;
/** MapLibre draws the whole world 512 dp wide at zoom 0. */
const WORLD_DP = 512;

/** The zoom at which `meters` on the ground spans `radiusDp` on screen, at this latitude. */
export function zoomForScale(meters: number, radiusDp: number, latitude: number): number {
  const metersPerDp = meters / radiusDp;
  return Math.log2((EARTH_CIRCUMFERENCE_M * Math.cos((latitude * Math.PI) / 180)) / (WORLD_DP * metersPerDp));
}

/** Map to draw behind the search area, or null for plain. Satellite falls back to streets outside the US. */
export function compassMapLayer(background: CompassBackground, latitude: number, longitude: number): MapLayer | null {
  if (background === 'plain') return null;
  if (background === 'satellite' && !likelyInUsgsCoverage(latitude, longitude)) return 'streets';
  return background;
}
