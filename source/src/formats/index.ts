import { GEOJSON_MIME, parseGeoJson, toGeoJson } from './geojson';
import { GPX_MIME, parseGpx, toGpx } from './gpx';
import { FormatError, type ExchangeFormat, type ExchangePlace, type ParseResult } from './types';

export { FormatError, type ExchangeFormat, type ExchangePlace, type ParseResult };

export const FORMATS: Record<ExchangeFormat, { label: string; extension: string; mimeType: string }> = {
  gpx: { label: 'GPX', extension: 'gpx', mimeType: GPX_MIME },
  geojson: { label: 'GeoJSON', extension: 'geojson', mimeType: GEOJSON_MIME },
};

/**
 * Picks the format for an imported file: by file extension, then MIME type, then by
 * looking at the content (`<` → GPX, `{` → GeoJSON).
 */
export function detectFormat(fileName: string, mimeType: string | undefined, content: string): ExchangeFormat {
  const ext = fileName.toLowerCase().split('.').pop();
  if (ext === 'gpx') return 'gpx';
  if (ext === 'geojson' || ext === 'json') return 'geojson';
  const mime = (mimeType ?? '').toLowerCase();
  if (mime.includes('gpx') || mime.endsWith('/xml')) return 'gpx';
  if (mime.includes('json')) return 'geojson';
  const first = content.trimStart()[0];
  if (first === '<') return 'gpx';
  if (first === '{') return 'geojson';
  throw new FormatError('Unrecognised file. Choose a .gpx or .geojson file.');
}

export function parsePlaces(fileName: string, mimeType: string | undefined, content: string): ParseResult {
  return detectFormat(fileName, mimeType, content) === 'gpx' ? parseGpx(content) : parseGeoJson(content);
}

export function serializePlaces(places: ExchangePlace[], format: ExchangeFormat, now: Date = new Date()): string {
  return format === 'gpx' ? toGpx(places, now) : toGeoJson(places);
}

/** e.g. findit-2026-10-29.gpx */
export function exportFileName(format: ExchangeFormat, now: Date = new Date()): string {
  return `findit-${now.toISOString().slice(0, 10)}.${FORMATS[format].extension}`;
}
