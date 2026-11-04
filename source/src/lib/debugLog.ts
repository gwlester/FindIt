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
const MAX_PENDING_CRASHES = 20;
const pendingCrashes: { tag: string; message: string; at: number }[] = [];
const lastLogged = new Map<string, number>();

export function setDebugLogging(db: SQLiteDatabase | null, enabled: boolean) {
  target = enabled ? db : null;
  lastLogged.clear();
  // Crashes that happened before the setting was read are kept in memory, and written only now
  // that logging is known to be on; otherwise they are dropped.
  const early = pendingCrashes.splice(0);
  if (target) for (const entry of early) debugLog(entry.tag, entry.message, entry.at);
}

export function isDebugLogging(): boolean {
  return target != null;
}

/** Adds an entry, e.g. debugLog('ble', 'Scan started'). */
export function debugLog(tag: string, message: string, at = Date.now()) {
  const db = target;
  if (!db) {
    if (tag === 'crash' && pendingCrashes.length < MAX_PENDING_CRASHES) pendingCrashes.push({ tag, message, at });
    return;
  }
  debugLogTo(db, tag, message, at);
}

/** Adds an entry to `db` even though logging is off (for the note that says it was just switched off). */
export function debugLogTo(db: SQLiteDatabase, tag: string, message: string, at = Date.now()) {
  queue = queue
    .then(async () => {
      await db.runAsync('INSERT INTO debug_log (at, tag, message) VALUES (?, ?, ?)', at, tag, message);
      await db.runAsync('DELETE FROM debug_log WHERE id <= (SELECT MAX(id) FROM debug_log) - ?', MAX_DEBUG_ENTRIES);
    })
    .catch(() => {});
}

/** Like debugLog, but writes at most once per `intervalMs` for each tag (for noisy streams such as GPS fixes). */
export function debugLogThrottled(tag: string, message: string, intervalMs: number, at = Date.now()) {
  if (!target) return;
  const last = lastLogged.get(tag);
  if (last !== undefined && at - last < intervalMs) return;
  lastLogged.set(tag, at);
  debugLog(tag, message, at);
}

/** Resolves once every queued entry is written. */
export function flushDebugLog(): Promise<void> {
  return queue;
}

/** The log, newest first. */
export function readDebugLog(db: SQLiteDatabase): Promise<DebugEntry[]> {
  return db.getAllAsync<DebugEntry>('SELECT id, at, tag, message FROM debug_log ORDER BY id DESC');
}

/** Deletes every entry; `note`, if given, is then written as the log's only entry (even while logging is off). */
export async function clearDebugLog(db: SQLiteDatabase, note?: string, at = Date.now()): Promise<void> {
  await flushDebugLog(); // so a queued entry cannot land after the clear
  await db.runAsync('DELETE FROM debug_log');
  if (note !== undefined) await db.runAsync('INSERT INTO debug_log (at, tag, message) VALUES (?, ?, ?)', at, 'app', note);
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
