import type { SQLiteDatabase } from 'expo-sqlite';

/** Someone who downloaded my shared places. */
export type ShareRecord = {
  id: number;
  /** ms since epoch, when they disconnected */
  at: number;
  /** Their display name, or 'FindIt user' for older versions that don't send one. */
  name: string;
  /** How many places they downloaded. */
  places: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export async function addShare(db: SQLiteDatabase, record: Omit<ShareRecord, 'id'>): Promise<void> {
  await db.runAsync('INSERT INTO share_history (at, name, places) VALUES (?, ?, ?)', record.at, record.name, record.places);
}

/** The history, newest first. */
export async function listShareHistory(db: SQLiteDatabase): Promise<ShareRecord[]> {
  return db.getAllAsync<ShareRecord>('SELECT id, at, name, places FROM share_history ORDER BY at DESC, id DESC');
}

/** Deletes entries older than `days` (null = keep forever). */
export async function pruneShareHistory(db: SQLiteDatabase, days: number | null, now = Date.now()): Promise<void> {
  if (days == null) return;
  await db.runAsync('DELETE FROM share_history WHERE at < ?', now - days * DAY_MS);
}

export async function clearShareHistory(db: SQLiteDatabase): Promise<void> {
  await db.runAsync('DELETE FROM share_history');
}
