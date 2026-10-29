import {
  areaName,
  deleteDownload,
  downloadArea,
  estimateTiles,
  listDownloads,
  offlineStyleUrl,
  watchDownload,
} from '../../src/lib/offlineMaps';
import { SATELLITE_STYLE, STREETS_STYLE_URL } from '../../src/lib/mapSources';
import { files } from '../helpers/fileSystemMock';
import { addFakePack, emitPackError, emitPackProgress, OfflineManager, packListenerIds } from '../helpers/maplibreMock';

const BOUNDS: [number, number, number, number] = [-91.2, 30.4, -91.1, 30.5];

test('streets download from the OpenFreeMap style; satellite from a saved copy of the USGS style', () => {
  expect(offlineStyleUrl('streets')).toBe(STREETS_STYLE_URL);
  const url = offlineStyleUrl('satellite');
  expect(url).toBe('file:///document/usgs-satellite-style.json');
  expect(JSON.parse(files[url])).toEqual(SATELLITE_STYLE);
});

test('estimates the tiles for a layer over its download zooms', () => {
  expect(estimateTiles(BOUNDS, 'streets')).toBeGreaterThan(0);
  expect(estimateTiles(BOUNDS, 'satellite')).toBeGreaterThan(estimateTiles(BOUNDS, 'streets'));
});

test('names an area after the nearest place within 5 km, otherwise its coordinates', () => {
  const places = [
    { name: 'Far', latitude: 31, longitude: -91 },
    { name: 'Oak', latitude: 30.45, longitude: -91.16 },
  ];
  expect(areaName(BOUNDS, places)).toBe('Near Oak');
  expect(areaName(BOUNDS, [places[0]])).toBe('30.45000° N, 91.15000° W');
});

test('downloads an area with its name, layer and date, reporting progress and errors', async () => {
  const progress = jest.fn();
  const error = jest.fn();
  const id = await downloadArea({ bounds: BOUNDS, layer: 'satellite', name: 'Near Oak', now: 1000 }, progress, error);
  expect(OfflineManager.createPack).toHaveBeenCalledWith(
    {
      mapStyle: 'file:///document/usgs-satellite-style.json',
      bounds: BOUNDS,
      minZoom: 10,
      maxZoom: 16,
      metadata: { name: 'Near Oak', layer: 'satellite', createdAt: 1000 },
    },
    expect.any(Function),
    expect.any(Function),
  );
  emitPackProgress(id, 42.4, 2_000_000);
  expect(progress).toHaveBeenLastCalledWith(42.4, 'active');
  emitPackError(id, 'offline');
  expect(error).toHaveBeenCalledWith('offline');
});

test('lists downloads newest first, with their status, and deletes them', async () => {
  const old = addFakePack({ name: 'Old', layer: 'streets', createdAt: 1 }, 100, 5_000_000);
  addFakePack({ name: 'New', layer: 'satellite', createdAt: 2 }, 50, 1_000_000);
  addFakePack({}, 100); // made by something else: sensible defaults
  const list = await listDownloads();
  expect(list.map((d) => [d.name, d.layer, d.percentage, d.bytes, d.complete])).toEqual([
    ['New', 'satellite', 50, 1_000_000, false],
    ['Old', 'streets', 100, 5_000_000, true],
    ['Offline area', 'streets', 100, 0, true],
  ]);
  await deleteDownload(old);
  expect((await listDownloads()).map((d) => d.name)).toEqual(['New', 'Offline area']);
});

test('watches a download until unsubscribed', async () => {
  const id = addFakePack({ name: 'A', layer: 'streets', createdAt: 1 }, 10);
  const onProgress = jest.fn();
  const stop = await watchDownload(id, onProgress);
  emitPackProgress(id, 60, 10);
  expect(onProgress).toHaveBeenLastCalledWith(id, 60, 10, false);
  emitPackError(id, 'ignored');
  stop();
  expect(packListenerIds()).not.toContain(id);
});
