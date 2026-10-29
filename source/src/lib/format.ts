export type Units = 'metric' | 'imperial';

const FEET_PER_METER = 3.28084;
const METERS_PER_MILE = 1609.344;

export function formatDistance(meters: number, units: Units): string {
  if (units === 'imperial') {
    const feet = meters * FEET_PER_METER;
    if (feet < 1000) return `${Math.round(feet)} ft`;
    const miles = meters / METERS_PER_MILE;
    return `${miles < 10 ? miles.toFixed(2) : miles.toFixed(1)} mi`;
  }
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return `${km < 10 ? km.toFixed(2) : km.toFixed(1)} km`;
}

export function formatCoordinate(value: number, positive: string, negative: string): string {
  return `${Math.abs(value).toFixed(5)}° ${value >= 0 ? positive : negative}`;
}

export function formatLatLon(latitude: number, longitude: number): string {
  return `${formatCoordinate(latitude, 'N', 'S')}, ${formatCoordinate(longitude, 'E', 'W')}`;
}

/** Local calendar date as YYYY-MM-DD. */
export function formatDate(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
