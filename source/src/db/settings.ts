import type { SQLiteDatabase } from 'expo-sqlite';

import type { Units } from '../lib/format';
import type { FindMode } from './finds';
import { DEFAULT_SEARCH_AREA_M } from '../lib/searchArea';

export type Settings = {
  /** Name other FindIt users see when we share. */
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
};

export const DEFAULT_SETTINGS: Settings = {
  displayName: 'FindIt user',
  units: 'metric',
  highAccuracyGps: true,
  searchAreaDistanceM: DEFAULT_SEARCH_AREA_M,
  findMode: 'once',
  hideFound: false,
  shareHistoryDays: 90,
};

const FIND_MODES: FindMode[] = ['off', 'once', 'log'];

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
    displayName: map.displayName ?? DEFAULT_SETTINGS.displayName,
    units: map.units === 'imperial' ? 'imperial' : 'metric',
    highAccuracyGps: map.highAccuracyGps !== 'false',
    searchAreaDistanceM: parseSearchArea(map.searchAreaDistanceM),
    findMode: FIND_MODES.includes(map.findMode as FindMode) ? (map.findMode as FindMode) : 'once',
    hideFound: map.hideFound === 'true',
    shareHistoryDays: parseHistoryDays(map.shareHistoryDays),
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
