import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'findit.db';

const MIGRATIONS: string[] = [
  `
  CREATE TABLE locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    accuracy REAL,
    notes TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'local',
    created_at INTEGER NOT NULL
  );
  CREATE TABLE settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
  // 2: finds (mark as found). finder '' = me, otherwise who it came from.
  `
  CREATE TABLE finds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    place_id INTEGER NOT NULL,
    found_at INTEGER NOT NULL,
    comment TEXT NOT NULL DEFAULT '',
    finder TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX finds_by_place ON finds (place_id, found_at);
  `,
];

/** Runs any migrations newer than the database's `user_version`. */
export async function migrateDatabase(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    const migration = MIGRATIONS[version];
    await db.withTransactionAsync(async () => {
      await db.execAsync(migration);
    });
    version++;
    await db.execAsync(`PRAGMA user_version = ${version}`);
  }
}
