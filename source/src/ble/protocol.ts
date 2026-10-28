import { utf8ByteLength as utf8Length } from '../lib/base64';

// Must match ShareServer.kt in modules/findit-native.
export const SERVICE_UUID = '5c0a7f10-2b7e-4d1a-9a37-f1d17000c0de';
export const INFO_UUID = '5c0a7f11-2b7e-4d1a-9a37-f1d17000c0de';
export const INDEX_UUID = '5c0a7f12-2b7e-4d1a-9a37-f1d17000c0de';
export const ITEM_UUID = '5c0a7f13-2b7e-4d1a-9a37-f1d17000c0de';

export const PROTOCOL_VERSION = 1;
const MAX_ITEM_BYTES = 500;

export type ShareInfo = { v: number; name: string; count: number };

/** A location as sent over the air. */
export type SharedPlace = {
  name: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  notes: string;
};

type WireItem = { n: string; la: number; lo: number; a: number | null; t: string };


export function encodeInfo(name: string, count: number): string {
  return JSON.stringify({ v: PROTOCOL_VERSION, name, count } satisfies ShareInfo);
}

export function decodeInfo(json: string): ShareInfo {
  const info = JSON.parse(json) as ShareInfo;
  if (typeof info.count !== 'number' || typeof info.name !== 'string') throw new Error('Invalid share info');
  return info;
}

/** Encodes a place, trimming notes so it fits a single characteristic value. */
export function encodeItem(place: SharedPlace): string {
  const item: WireItem = {
    n: place.name,
    la: place.latitude,
    lo: place.longitude,
    a: place.accuracy == null ? null : Math.round(place.accuracy * 10) / 10,
    t: place.notes,
  };
  let json = JSON.stringify(item);
  while (utf8Length(json) > MAX_ITEM_BYTES && item.t.length > 0) {
    item.t = item.t.slice(0, Math.max(0, item.t.length - 16));
    json = JSON.stringify(item);
  }
  while (utf8Length(json) > MAX_ITEM_BYTES && item.n.length > 1) {
    item.n = item.n.slice(0, item.n.length - 4);
    json = JSON.stringify(item);
  }
  return json;
}

export function decodeItem(json: string): SharedPlace {
  const item = JSON.parse(json) as WireItem;
  if (typeof item.n !== 'string' || typeof item.la !== 'number' || typeof item.lo !== 'number') {
    throw new Error('Invalid shared location');
  }
  return {
    name: item.n,
    latitude: item.la,
    longitude: item.lo,
    accuracy: typeof item.a === 'number' ? item.a : null,
    notes: typeof item.t === 'string' ? item.t : '',
  };
}
