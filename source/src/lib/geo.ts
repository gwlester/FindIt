const EARTH_RADIUS_M = 6371008.8;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

export type LatLon = { latitude: number; longitude: number };

/** Great-circle distance in metres (haversine). */
export function distanceMeters(from: LatLon, to: LatLon): number {
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Initial bearing from `from` to `to`, degrees clockwise from true north (0–360). */
export function bearingDegrees(from: LatLon, to: LatLon): number {
  const φ1 = toRad(from.latitude);
  const φ2 = toRad(to.latitude);
  const Δλ = toRad(to.longitude - from.longitude);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return normalizeDegrees(toDeg(Math.atan2(y, x)));
}

export function normalizeDegrees(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * Combined 1-sigma uncertainty of the distance, from our GPS accuracy and the
 * accuracy recorded when the target was saved (if known).
 */
export function combinedUncertainty(ourAccuracy: number | null, targetAccuracy: number | null): number | null {
  if (ourAccuracy == null && targetAccuracy == null) return null;
  return Math.hypot(ourAccuracy ?? 0, targetAccuracy ?? 0);
}

const POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export function compassPoint(deg: number): string {
  return POINTS[Math.round(normalizeDegrees(deg) / 45) % 8];
}

export function isValidLatitude(lat: number) {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

export function isValidLongitude(lon: number) {
  return Number.isFinite(lon) && lon >= -180 && lon <= 180;
}

/**
 * Parses a single coordinate in decimal degrees ("-91.1908"), degrees and
 * decimal minutes ("W 091° 11.456") or degrees/minutes/seconds ("91°11'27.4\"W").
 * A hemisphere letter may come first or last; S and W make the value negative.
 * Returns null if the text can't be parsed.
 */
export function parseCoordinate(text: string, axis: 'lat' | 'lon'): number | null {
  let s = text.trim().toUpperCase();
  if (!s) return null;
  const hemis = axis === 'lat' ? 'NS' : 'EW';
  let sign = 1;
  const lead = s.match(new RegExp(`^([${hemis}])\\s*`));
  const trail = s.match(new RegExp(`\\s*([${hemis}])$`));
  const hemi = lead?.[1] ?? trail?.[1];
  if (lead) s = s.slice(lead[0].length);
  else if (trail) s = s.slice(0, s.length - trail[0].length);
  if (hemi === 'S' || hemi === 'W') sign = -1;
  if (s.startsWith('-')) {
    sign = -sign;
    s = s.slice(1);
  }
  if (/[^0-9.\s°'"′″]/.test(s)) return null;
  const parts = s
    .split(/[\s°'"′″]+/)
    .filter(Boolean)
    .map(Number);
  if (parts.length === 0 || parts.length > 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [deg, min = 0, sec = 0] = parts;
  if (min >= 60 || sec >= 60) return null;
  const value = sign * (deg + min / 60 + sec / 3600);
  const valid = axis === 'lat' ? isValidLatitude(value) : isValidLongitude(value);
  return valid ? value : null;
}
