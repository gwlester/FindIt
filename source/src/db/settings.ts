import type { SQLiteDatabase } from 'expo-sqlite';

import type { Units } from '../lib/format';

export type Settings = {
  /** Name other FindIt users see when we share. */
  displayName: string;
  units: Units;
  /** Ask the GNSS chipset for full tracking on the compass/averaging screens (more battery). */
  highAccuracyGps: boolean;
};

export const DEFAULT_SETTINGS: Settings = { displayName: 'FindIt user', units: 'metric', highAccuracyGps: true };

export async function loadSettings(db: SQLiteDatabase): Promise<Settings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    displayName: map.displayName ?? DEFAULT_SETTINGS.displayName,
    units: map.units === 'imperial' ? 'imperial' : 'metric',
    highAccuracyGps: map.highAccuracyGps !== 'false',
  };
}

export async function saveSettings(db: SQLiteDatabase, settings: Settings): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const [key, value] of Object.entries(settings)) {
      await db.runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        key,
        String(value),
      );
    }
  });
}
