import type { SQLiteDatabase } from 'expo-sqlite';

import { formatDate } from '../lib/format';

/** How finds are recorded (setting): off = feature hidden; once = one find per place; log = every find. */
export type FindMode = 'off' | 'once' | 'log';

export type Find = {
  id: number;
  placeId: number;
  /** ms since epoch */
  foundAt: number;
  comment: string;
  /** Who found it: '' = me, otherwise the name of the FindCache user it came from. */
  finder: string;
};

export type FindSummary = {
  count: number;
  /** My own finds (finder ''). */
  myCount: number;
  myLastFoundAt: number | null;
  /** Latest find by anyone. */
  lastFoundAt: number;
  lastFinder: string;
  /** Comment of my latest find if I've found it, otherwise of the latest find. */
  lastComment: string;
};

type Row = { id: number; place_id: number; found_at: number; comment: string; finder: string };

/**
 * Records a find. In "once" mode my latest find of the place is updated instead of a new
 * one being added (older log entries from "log" mode are kept). Finds by other people are
 * always added.
 */
export async function recordFind(
  db: SQLiteDatabase,
  placeId: number,
  { foundAt, comment, finder = '' }: { foundAt: number; comment: string; finder?: string },
  mode: Exclude<FindMode, 'off'>,
): Promise<void> {
  if (mode === 'once' && finder === '') {
    const latest = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM finds WHERE place_id = ? AND finder = '' ORDER BY found_at DESC, id DESC LIMIT 1",
      placeId,
    );
    if (latest) {
      await db.runAsync('UPDATE finds SET found_at = ?, comment = ? WHERE id = ?', foundAt, comment, latest.id);
      return;
    }
  }
  await db.runAsync(
    'INSERT INTO finds (place_id, found_at, comment, finder) VALUES (?, ?, ?, ?)',
    placeId,
    foundAt,
    comment,
    finder,
  );
}

/** A place's finds, newest first. */
export async function listFinds(db: SQLiteDatabase, placeId: number): Promise<Find[]> {
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM finds WHERE place_id = ? ORDER BY found_at DESC, id DESC',
    placeId,
  );
  return rows.map((r) => ({ id: r.id, placeId: r.place_id, foundAt: r.found_at, comment: r.comment, finder: r.finder }));
}

/** Summary of a place's finds (newest first), or null if it hasn't been found. */
export function summarizeFinds(finds: Find[]): FindSummary | null {
  if (finds.length === 0) return null;
  const mine = finds.filter((f) => f.finder === '');
  return {
    count: finds.length,
    myCount: mine.length,
    myLastFoundAt: mine[0]?.foundAt ?? null,
    lastFoundAt: finds[0].foundAt,
    lastFinder: finds[0].finder,
    lastComment: (mine[0] ?? finds[0]).comment,
  };
}

/** e.g. "Found 2026-10-20", "Found 2 times, last 2026-10-21", "Found by Alex 2026-10-22". */
export function foundLabel(summary: FindSummary | null): string | null {
  if (!summary) return null;
  if (summary.myCount > 1) return `Found ${summary.myCount} times, last ${formatDate(summary.myLastFoundAt!)}`;
  if (summary.myCount === 1) return `Found ${formatDate(summary.myLastFoundAt!)}`;
  return `Found by ${summary.lastFinder} ${formatDate(summary.lastFoundAt)}`;
}

/** Summaries for every place that has been found, by place id. */
export async function findSummaries(db: SQLiteDatabase): Promise<Map<number, FindSummary>> {
  const rows = await db.getAllAsync<Row>('SELECT * FROM finds ORDER BY found_at DESC, id DESC');
  const byPlace = new Map<number, Find[]>();
  for (const r of rows) {
    const list = byPlace.get(r.place_id) ?? [];
    list.push({ id: r.id, placeId: r.place_id, foundAt: r.found_at, comment: r.comment, finder: r.finder });
    byPlace.set(r.place_id, list);
  }
  return new Map([...byPlace].map(([id, finds]) => [id, summarizeFinds(finds)!]));
}
