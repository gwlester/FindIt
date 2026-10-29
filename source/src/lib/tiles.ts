// Web-mercator tile arithmetic for sizing offline map downloads.

import type { MapLayer } from './mapSources';

export type Bounds = [west: number, south: number, east: number, north: number];

/** Zooms downloaded per layer: OpenFreeMap vector tiles stop at 14 (higher zooms reuse them); USGS imagery goes to 16. */
export const OFFLINE_ZOOMS: Record<MapLayer, { min: number; max: number }> = {
  streets: { min: 10, max: 14 },
  satellite: { min: 10, max: 16 },
};

/** Largest download allowed, to stay a polite user of free tile servers. */
export const MAX_DOWNLOAD_TILES = 6000;

const MAX_LAT = 85.0511;

function tileX(lon: number, n: number) {
  return Math.min(n - 1, Math.floor(((lon + 180) / 360) * n));
}

function tileY(lat: number, n: number) {
  const r = (Math.max(-MAX_LAT, Math.min(MAX_LAT, lat)) * Math.PI) / 180;
  return Math.min(n - 1, Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n));
}

/** Number of tiles covering `bounds` at every zoom from minZoom to maxZoom. */
export function tileCount([west, south, east, north]: Bounds, minZoom: number, maxZoom: number): number {
  let total = 0;
  for (let z = minZoom; z <= maxZoom; z++) {
    const n = 2 ** z;
    total += (tileX(east, n) - tileX(west, n) + 1) * (tileY(south, n) - tileY(north, n) + 1);
  }
  return total;
}
