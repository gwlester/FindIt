// GPX 1.1 (https://www.topografix.com/GPX/1/1/) import and export.
//
// Places are waypoints (<wpt>). FindIt's recorded accuracy is stored in a small
// <findit:accuracy> extension that other apps ignore. On import, geocaching.com files
// are understood too: the cache name and the hint come from their Groundspeak extension.

import { XMLParser, XMLValidator } from 'fast-xml-parser';

import { FormatError, isValidCoordinate, type ExchangePlace, type ParseResult } from './types';

export const GPX_MIME = 'application/gpx+xml';
export const FINDIT_GPX_NS = 'https://github.com/gwlester/findit/gpx/1';

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Formats a coordinate without exponent notation and with ~1 cm precision. */
function coordinate(value: number): string {
  return value.toFixed(7).replace(/\.?0+$/, '');
}

export function toGpx(places: ExchangePlace[], now: Date = new Date()): string {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<gpx version="1.1" creator="FindIt" xmlns="http://www.topografix.com/GPX/1/1" xmlns:findit="${FINDIT_GPX_NS}"` +
      ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' +
      ' xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">',
    '  <metadata>',
    '    <name>FindIt places</name>',
    `    <time>${now.toISOString()}</time>`,
    '  </metadata>',
  ];
  for (const p of places) {
    // Child order is fixed by the GPX schema: time, name, desc, sym, extensions.
    lines.push(`  <wpt lat="${coordinate(p.latitude)}" lon="${coordinate(p.longitude)}">`);
    if (p.createdAt != null) lines.push(`    <time>${new Date(p.createdAt).toISOString()}</time>`);
    lines.push(`    <name>${escapeXml(p.name)}</name>`);
    if (p.notes) lines.push(`    <desc>${escapeXml(p.notes)}</desc>`);
    lines.push('    <sym>Geocache</sym>');
    if (p.accuracy != null) {
      lines.push('    <extensions>');
      lines.push(`      <findit:accuracy>${Math.round(p.accuracy * 10) / 10}</findit:accuracy>`);
      lines.push('    </extensions>');
    }
    lines.push('  </wpt>');
  }
  lines.push('</gpx>', '');
  return lines.join('\n');
}

type XmlNode = Record<string, unknown>;

/** Text content of a parsed element (which may be a string, a number or {#text, @_attr}). */
function text(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (value && typeof value === 'object' && '#text' in value) return text((value as XmlNode)['#text']);
  return '';
}

function node(value: unknown): XmlNode | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as XmlNode) : null;
}

function parseWaypoint(wpt: XmlNode, index: number): ExchangePlace | null {
  const latitude = Number(text(wpt['@_lat']));
  const longitude = Number(text(wpt['@_lon']));
  if (!isValidCoordinate(latitude, longitude)) return null;

  const extensions = node(wpt.extensions);
  // Groundspeak cache details: inside <extensions> in GPX 1.1, directly in <wpt> in GPX 1.0.
  const cache = node(extensions?.cache) ?? node(wpt.cache);
  const code = text(wpt.name);
  const cacheName = text(cache?.name) || text(wpt.urlname);
  const name =
    (cacheName && code && cacheName !== code ? `${cacheName} (${code})` : cacheName || code) ||
    text(wpt.desc) ||
    `Waypoint ${index + 1}`;

  const hint = text(cache?.encoded_hints);
  const description = cacheName ? text(wpt.cmt) : text(wpt.desc) || text(wpt.cmt);
  const notes = [description, hint ? `Hint: ${hint}` : ''].filter(Boolean).join('\n');

  const accuracyText = text(extensions?.accuracy);
  const accuracy = accuracyText === '' ? NaN : Number(accuracyText);
  const time = Date.parse(text(wpt.time));

  return {
    name,
    latitude,
    longitude,
    accuracy: Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : null,
    notes,
    createdAt: Number.isFinite(time) ? time : null,
  };
}

/** Reads the waypoints of a GPX 1.0 / 1.1 file. Routes and tracks are counted as skipped. */
export function parseGpx(xml: string): ParseResult {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    removeNSPrefix: true,
    parseTagValue: false,
    parseAttributeValue: false,
    isArray: (tagName) => ['wpt', 'rte', 'trk'].includes(tagName),
  });
  const valid = XMLValidator.validate(xml);
  if (valid !== true) throw new FormatError(`Not a valid GPX file: ${valid.err.msg} (line ${valid.err.line})`);
  const doc = parser.parse(xml) as XmlNode;
  const gpx = node(doc.gpx);
  if (!gpx) throw new FormatError('Not a GPX file (no <gpx> element).');

  const waypoints = (gpx.wpt as unknown[] | undefined) ?? [];
  const places: ExchangePlace[] = [];
  let skipped = ((gpx.rte as unknown[] | undefined)?.length ?? 0) + ((gpx.trk as unknown[] | undefined)?.length ?? 0);
  waypoints.forEach((w, i) => {
    const wpt = node(w);
    const place = wpt ? parseWaypoint(wpt, i) : null;
    if (place) places.push(place);
    else skipped++;
  });
  return { format: 'gpx', places, skipped };
}
