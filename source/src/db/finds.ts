import type { SQLiteDatabase } from 'expo-sqlite';

/** How finds are recorded (setting): off = feature hidden; once = one find per place; log = every find. */
export type FindMode = 'off' | 'once' | 'log';

export type Find = {
  id: number;
  placeId: number;
  /** ms since epoch */
  foundAt: number;
  comment: string;
  /** Who found it: '' = me, otherwise the name of the FindIt user it came from. */
  finder: string;
};

export type FindSummary = {
  count: number;
  lastFoundAt: number;
  lastComment: string;
  /** Whether I (not just someone else) have found it. */
  foundByMe: boolean;
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

/** Count and latest find for every place that has been found. */
export async function findSummaries(db: SQLiteDatabase): Promise<Map<number, FindSummary>> {
  const rows = await db.getAllAsync<{ place_id: number; n: number; last: number; comment: string; mine: number }>(
    `SELECT f.place_id, COUNT(*) AS n, MAX(f.found_at) AS last, SUM(f.finder = '') AS mine,
       (SELECT comment FROM finds l WHERE l.place_id = f.place_id ORDER BY l.found_at DESC, l.id DESC LIMIT 1) AS comment
     FROM finds f GROUP BY f.place_id`,
  );
  return new Map(
    rows.map((r) => [
      r.place_id,
      { count: r.n, lastFoundAt: r.last, lastComment: r.comment, foundByMe: r.mine > 0 },
    ]),
  );
}
