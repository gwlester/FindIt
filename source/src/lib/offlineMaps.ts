// Offline map areas (MapLibre offline packs): download what's on screen before heading out,
// so the map works with no connection.

import { OfflineManager } from '@maplibre/maplibre-react-native';
import { File, Paths } from 'expo-file-system';

import { formatLatLon } from './format';
import { distanceMeters } from './geo';
import { SATELLITE_STYLE, STREETS_STYLE_URL, type MapLayer } from './mapSources';
import { OFFLINE_ZOOMS, tileCount, type Bounds } from './tiles';

export type Download = {
  id: string;
  name: string;
  layer: MapLayer;
  createdAt: number;
  percentage: number;
  bytes: number;
  complete: boolean;
};

const NAME_RADIUS_M = 5000;

/**
 * Offline packs need a style URL. Satellite has an inline style, so a copy is saved as a
 * file; tiles are cached by their URL, so the live map uses them too.
 */
export function offlineStyleUrl(layer: MapLayer): string {
  if (layer === 'streets') return STREETS_STYLE_URL;
  const file = new File(Paths.document, 'usgs-satellite-style.json');
  file.create({ overwrite: true });
  file.write(JSON.stringify(SATELLITE_STYLE));
  return file.uri;
}

export function estimateTiles(bounds: Bounds, layer: MapLayer): number {
  return tileCount(bounds, OFFLINE_ZOOMS[layer].min, OFFLINE_ZOOMS[layer].max);
}

/** "Near <place>" for the nearest place within 5 km of the area's centre, else its coordinates. */
export function areaName(
  [west, south, east, north]: Bounds,
  places: { name: string; latitude: number; longitude: number }[],
): string {
  const centre = { latitude: (south + north) / 2, longitude: (west + east) / 2 };
  const nearest = places
    .map((p) => ({ p, d: distanceMeters(centre, p) }))
    .filter(({ d }) => d <= NAME_RADIUS_M)
    .sort((a, b) => a.d - b.d)[0];
  return nearest ? `Near ${nearest.p.name}` : formatLatLon(centre.latitude, centre.longitude);
}

/** Starts downloading an area; resolves to the download's id. */
export async function downloadArea(
  { bounds, layer, name, now = Date.now() }: { bounds: Bounds; layer: MapLayer; name: string; now?: number },
  onProgress: (percentage: number, state: string) => void,
  onError: (message: string) => void,
): Promise<string> {
  const pack = await OfflineManager.createPack(
    {
      mapStyle: offlineStyleUrl(layer),
      bounds,
      minZoom: OFFLINE_ZOOMS[layer].min,
      maxZoom: OFFLINE_ZOOMS[layer].max,
      metadata: { name, layer, createdAt: now },
    },
    (_pack, status) => onProgress(status.percentage, status.state),
    (_pack, error) => onError(error.message),
  );
  return pack.id;
}

/** Every downloaded (or downloading) area, newest first. */
export async function listDownloads(): Promise<Download[]> {
  const packs = await OfflineManager.getPacks();
  const list = await Promise.all(
    packs.map(async (pack): Promise<Download> => {
      const status = await pack.status();
      const meta = pack.metadata;
      return {
        id: pack.id,
        name: typeof meta.name === 'string' ? meta.name : 'Offline area',
        layer: meta.layer === 'satellite' ? 'satellite' : 'streets',
        createdAt: typeof meta.createdAt === 'number' ? meta.createdAt : 0,
        percentage: status.percentage,
        bytes: status.completedResourceSize,
        complete: status.state === 'complete',
      };
    }),
  );
  return list.sort((a, b) => b.createdAt - a.createdAt);
}

export function deleteDownload(id: string): Promise<void> {
  return OfflineManager.deletePack(id);
}

/** Follows a download's progress; call the returned function to stop. */
export async function watchDownload(
  id: string,
  onProgress: (id: string, percentage: number, bytes: number, complete: boolean) => void,
): Promise<() => void> {
  await OfflineManager.addListener(
    id,
    (_pack, s) => onProgress(id, s.percentage, s.completedResourceSize, s.state === 'complete'),
    () => {},
  );
  return () => OfflineManager.removeListener(id);
}
