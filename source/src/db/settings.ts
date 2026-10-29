import type { SQLiteDatabase } from 'expo-sqlite';

import type { Units } from '../lib/format';
import type { FindMode } from './finds';
import type { CompassBackground } from '../lib/compassMap';
import type { MapLayer } from '../lib/mapSources';
import { defaultDisplayName, FALLBACK_NAME } from '../lib/deviceName';
import { DEFAULT_SEARCH_AREA_M } from '../lib/searchArea';

export type Settings = {
  /** Name other FindCache users see when we share. */
  displayName: string;
  units: Units;
  /** Ask the GNSS chipset for full tracking on the compass/averaging screens (more battery). */
  highAccuracyGps: boolean;
  /** Within this distance (m) the compass shows the search area instead of the arrow; null = always the arrow. */
  searchAreaDistanceM: number | null;
  /** Mark as found: off, once per place, or a log of every find. */
  findMode: FindMode;
  /** Hide places I've found from the list. */
  hideFound: boolean;
  /** Days to keep the sharing history; null = forever. */
  shareHistoryDays: number | null;
  /** Last layer chosen on the map screen. */
  mapLayer: MapLayer;
  /** What to draw behind the compass's search-area view. */
  compassBackground: CompassBackground;
};

export const DEFAULT_SETTINGS: Settings = {
  displayName: FALLBACK_NAME,
  units: 'metric',
  highAccuracyGps: true,
  searchAreaDistanceM: DEFAULT_SEARCH_AREA_M,
  findMode: 'once',
  hideFound: false,
  shareHistoryDays: 90,
  mapLayer: 'streets',
  compassBackground: 'plain',
};

const FIND_MODES: FindMode[] = ['off', 'once', 'log'];
const BACKGROUNDS: CompassBackground[] = ['plain', 'streets', 'satellite'];

function parseSearchArea(value: string | undefined): number | null {
  if (value === 'off') return null;
  const meters = Number(value);
  return value !== undefined && Number.isFinite(meters) && meters > 0 ? meters : DEFAULT_SEARCH_AREA_M;
}

function parseHistoryDays(value: string | undefined): number | null {
  if (value === 'off') return null;
  const days = Number(value);
  return value !== undefined && Number.isInteger(days) && days > 0 ? days : 90;
}

export async function loadSettings(db: SQLiteDatabase): Promise<Settings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    // Until the user picks a name, share under the phone's own name. The old built-in default
    // may already be stored, so it counts as "not chosen" too.
    displayName: !map.displayName || map.displayName === FALLBACK_NAME ? defaultDisplayName() : map.displayName,
    units: map.units === 'imperial' ? 'imperial' : 'metric',
    highAccuracyGps: map.highAccuracyGps !== 'false',
    searchAreaDistanceM: parseSearchArea(map.searchAreaDistanceM),
    findMode: FIND_MODES.includes(map.findMode as FindMode) ? (map.findMode as FindMode) : 'once',
    hideFound: map.hideFound === 'true',
    shareHistoryDays: parseHistoryDays(map.shareHistoryDays),
    mapLayer: map.mapLayer === 'satellite' ? 'satellite' : 'streets',
    compassBackground: BACKGROUNDS.includes(map.compassBackground as CompassBackground)
      ? (map.compassBackground as CompassBackground)
      : 'plain',
  };
}

export async function saveSettings(db: SQLiteDatabase, settings: Settings): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const [key, value] of Object.entries(settings)) {
      await db.runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        key,
        value === null ? 'off' : String(value),
      );
    }
  });
}
