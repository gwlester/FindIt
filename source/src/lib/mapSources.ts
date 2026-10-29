// Free map sources. Streets: OpenFreeMap (OpenStreetMap data, no key). Satellite: USGS
// National Map imagery (public domain, United States only).

import type { StyleSpecification } from '@maplibre/maplibre-react-native';

export type MapLayer = 'streets' | 'satellite';

export const STREETS_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

const USGS_IMAGERY_TILES =
  'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}';

export const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    usgs: {
      type: 'raster',
      tiles: [USGS_IMAGERY_TILES],
      tileSize: 256,
      maxzoom: 16,
      attribution: 'Imagery: USGS The National Map',
    },
  },
  layers: [{ id: 'usgs-imagery', type: 'raster', source: 'usgs' }],
};

export function mapStyleFor(layer: MapLayer): string | StyleSpecification {
  return layer === 'satellite' ? SATELLITE_STYLE : STREETS_STYLE_URL;
}

// Rough boxes [south, west, north, east] for the US states and Puerto Rico / USVI. Close to
// the border they include a little of Canada and Mexico, so this is "likely", not exact.
const US_BOXES: [number, number, number, number][] = [
  [24.3, -125, 49.5, -66.8], // contiguous states
  [51, -180, 71.6, -129.9], // Alaska
  [18.8, -160.3, 22.3, -154.7], // Hawaii
  [17.6, -67.4, 18.6, -64.5], // Puerto Rico, US Virgin Islands
];
// Most of Mexico (south of 25.8° N), cut out of the contiguous-states box.
const MEXICO: [number, number, number, number] = [14, -118, 25.8, -97.2];

/** Whether USGS imagery probably covers this point. */
export function likelyInUsgsCoverage(lat: number, lon: number): boolean {
  const inBox = ([s, w, n, e]: [number, number, number, number]) => lat >= s && lat <= n && lon >= w && lon <= e;
  return US_BOXES.some(inBox) && !inBox(MEXICO);
}
