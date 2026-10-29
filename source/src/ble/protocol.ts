import type { ExchangeFind } from '../formats/types';
import { utf8ByteLength as utf8Length } from '../lib/base64';

// Must match ShareServer.kt in modules/findit-native.
export const SERVICE_UUID = '5c0a7f10-2b7e-4d1a-9a37-f1d17000c0de';
export const INFO_UUID = '5c0a7f11-2b7e-4d1a-9a37-f1d17000c0de';
export const INDEX_UUID = '5c0a7f12-2b7e-4d1a-9a37-f1d17000c0de';
export const ITEM_UUID = '5c0a7f13-2b7e-4d1a-9a37-f1d17000c0de';
/** v2: the receiver writes its display name here so the sharer can keep a history. */
export const NAME_UUID = '5c0a7f14-2b7e-4d1a-9a37-f1d17000c0de';

export const PROTOCOL_VERSION = 2;
const MAX_ITEM_BYTES = 500;
const MAX_NAME_BYTES = 40;

export type ShareInfo = { v: number; name: string; count: number };

/** A location as sent over the air. */
export type SharedPlace = {
  name: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  notes: string;
  /** Finds, newest first ('' finder = the sender). Only sent when the sender chose to. */
  finds?: ExchangeFind[];
};

type WireFind = [number, string] | [number, string, string];
type WireItem = { n: string; la: number; lo: number; a: number | null; t: string; f?: WireFind[] };

/** The receiver's name for the NAME characteristic: trimmed, at most 40 UTF-8 bytes, whole characters only. */
export function encodeName(name: string): string {
  let out = '';
  for (const ch of name.trim()) {
    if (utf8Length(out + ch) > MAX_NAME_BYTES) break;
    out += ch;
  }
  return out;
}

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
  const finds = [...(place.finds ?? [])].sort((x, y) => y.foundAt - x.foundAt);
  if (finds.length) item.f = finds.map((f): WireFind => (f.finder ? [f.foundAt, f.comment, f.finder] : [f.foundAt, f.comment]));
  let json = JSON.stringify(item);
  // Make it fit: drop the oldest finds first, then trim notes, then the name.
  while (utf8Length(json) > MAX_ITEM_BYTES && item.f?.length) {
    item.f.pop();
    if (item.f.length === 0) delete item.f;
    json = JSON.stringify(item);
  }
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
    finds: (Array.isArray(item.f) ? item.f : [])
      .filter((f): f is WireFind => Array.isArray(f) && typeof f[0] === 'number')
      .map((f) => ({
        foundAt: f[0],
        comment: typeof f[1] === 'string' ? f[1] : '',
        finder: typeof f[2] === 'string' ? f[2] : '',
      })),
  };
}
