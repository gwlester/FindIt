// GeoJSON (RFC 7946) import and export. Places are Point features; coordinates are
// [longitude, latitude] (longitude first!).

import { FormatError, isValidCoordinate, type ExchangeFind, type ExchangePlace, type ParseResult } from './types';

export const GEOJSON_MIME = 'application/geo+json';

type Json = Record<string, unknown>;

export function toGeoJson(places: ExchangePlace[]): string {
  const collection = {
    type: 'FeatureCollection',
    features: places.map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
      properties: {
        name: p.name,
        notes: p.notes,
        accuracy: p.accuracy,
        createdAt: p.createdAt == null ? null : new Date(p.createdAt).toISOString(),
        ...(p.finds?.length
          ? {
              finds: p.finds.map((f) => ({
                foundAt: new Date(f.foundAt).toISOString(),
                comment: f.comment,
                finder: f.finder,
              })),
            }
          : {}),
      },
    })),
  };
  return JSON.stringify(collection, null, 2) + '\n';
}

function object(value: unknown): Json | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : null;
}

function firstString(props: Json, keys: string[]): string {
  for (const key of keys) {
    const v = props[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

function parseFeature(feature: Json, index: number): ExchangePlace | null {
  const geometry = object(feature.geometry);
  if (geometry?.type !== 'Point' || !Array.isArray(geometry.coordinates)) return null;
  const [longitude, latitude] = geometry.coordinates as unknown[];
  if (!isValidCoordinate(latitude, longitude)) return null;

  const props = object(feature.properties) ?? {};
  const accuracy = props.accuracy;
  const created = typeof props.createdAt === 'string' ? Date.parse(props.createdAt) : NaN;
  return {
    name: firstString(props, ['name', 'title', 'Name']) || `Point ${index + 1}`,
    latitude: latitude as number,
    longitude: longitude as number,
    accuracy: typeof accuracy === 'number' && Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : null,
    notes: firstString(props, ['notes', 'description', 'desc']),
    createdAt: Number.isFinite(created) ? created : null,
    finds: parseFinds(props.finds),
  };
}

function parseFinds(value: unknown): ExchangeFind[] {
  if (!Array.isArray(value)) return [];
  const finds: ExchangeFind[] = [];
  for (const v of value) {
    const f = object(v);
    const foundAt = typeof f?.foundAt === 'string' ? Date.parse(f.foundAt) : NaN;
    if (f && Number.isFinite(foundAt)) {
      finds.push({
        foundAt,
        comment: typeof f.comment === 'string' ? f.comment : '',
        finder: typeof f.finder === 'string' ? f.finder : '',
      });
    }
  }
  return finds;
}

/** Reads Point features from a FeatureCollection, a single Feature or a bare Point. */
export function parseGeoJson(source: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(source);
  } catch (e) {
    throw new FormatError(`Not a valid GeoJSON file: ${e instanceof Error ? e.message : String(e)}`);
  }
  const root = object(data);
  let features: unknown[];
  if (root?.type === 'FeatureCollection' && Array.isArray(root.features)) features = root.features;
  else if (root?.type === 'Feature') features = [root];
  else if (root?.type === 'Point') features = [{ type: 'Feature', geometry: root, properties: {} }];
  else throw new FormatError('Not a GeoJSON file (expected a FeatureCollection, Feature or Point).');

  const places: ExchangePlace[] = [];
  let skipped = 0;
  features.forEach((f, i) => {
    const feature = object(f);
    const place = feature ? parseFeature(feature, i) : null;
    if (place) places.push(place);
    else skipped++;
  });
  return { format: 'geojson', places, skipped };
}
