import type { InitialViewState } from '@maplibre/maplibre-react-native';

type Point = { latitude: number; longitude: number };

const PAD = 0.1; // fraction of the span added on each side
const MIN_SPAN = 0.005; // degrees (~500 m), so close points don't zoom in too far
const SINGLE_ZOOM = 16;

/** The map's starting view: one point centred at street level, several framed to fit, none → null. */
export function initialView(points: Point[]): InitialViewState | null {
  if (points.length === 0) return null;
  if (points.length === 1) return { center: [points[0].longitude, points[0].latitude], zoom: SINGLE_ZOOM };
  const lats = points.map((p) => p.latitude);
  const lons = points.map((p) => p.longitude);
  const pad = (min: number, max: number) => {
    const span = Math.max(max - min, MIN_SPAN);
    const mid = (min + max) / 2;
    const half = span / 2 + span * PAD;
    return [round(mid - half), round(mid + half)];
  };
  const [south, north] = pad(Math.min(...lats), Math.max(...lats));
  const [west, east] = pad(Math.min(...lons), Math.max(...lons));
  return { bounds: [west, south, east, north] };
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;
