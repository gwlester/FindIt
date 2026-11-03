// Debug log (Settings → Troubleshooting → Enable debug logging): a record of what the app
// does, kept on the phone in SQLite so problems can be diagnosed. Callable from anywhere;
// a no-op while logging is off. Writes are queued so entries keep their order and never
// slow down or break the caller.

import type { SQLiteDatabase } from 'expo-sqlite';

export type DebugEntry = { id: number; at: number; tag: string; message: string };

/** Only the newest entries are kept. */
export const MAX_DEBUG_ENTRIES = 2000;

let target: SQLiteDatabase | null = null;
let queue: Promise<void> = Promise.resolve();

export function setDebugLogging(db: SQLiteDatabase | null, enabled: boolean) {
  target = enabled ? db : null;
}

export function isDebugLogging(): boolean {
  return target != null;
}

/** Adds an entry, e.g. debugLog('ble', 'Scan started'). */
export function debugLog(tag: string, message: string, at = Date.now()) {
  const db = target;
  if (!db) return;
  queue = queue
    .then(async () => {
      await db.runAsync('INSERT INTO debug_log (at, tag, message) VALUES (?, ?, ?)', at, tag, message);
      await db.runAsync('DELETE FROM debug_log WHERE id <= (SELECT MAX(id) FROM debug_log) - ?', MAX_DEBUG_ENTRIES);
    })
    .catch(() => {});
}

/** Resolves once every queued entry is written. */
export function flushDebugLog(): Promise<void> {
  return queue;
}

/** The log, newest first. */
export function readDebugLog(db: SQLiteDatabase): Promise<DebugEntry[]> {
  return db.getAllAsync<DebugEntry>('SELECT id, at, tag, message FROM debug_log ORDER BY id DESC');
}

export async function clearDebugLog(db: SQLiteDatabase): Promise<void> {
  await db.runAsync('DELETE FROM debug_log');
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

function timestamp(ms: number) {
  const d = new Date(ms);
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`
  );
}

/** Plain text, oldest first: "2026-11-02 09:05:07.042 [ble] message". */
export function formatDebugLog(entries: DebugEntry[]): string {
  return [...entries]
    .sort((a, b) => a.id - b.id)
    .map((e) => `${timestamp(e.at)} [${e.tag}] ${e.message}\n`)
    .join('');
}
