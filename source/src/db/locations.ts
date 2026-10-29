import type { SQLiteDatabase } from 'expo-sqlite';

export type Place = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  /** Horizontal accuracy (m) when the place was recorded, if known. */
  accuracy: number | null;
  notes: string;
  /** 'local', or the name of the FindIt user it was received from. */
  source: string;
  createdAt: number;
};

export type NewPlace = Omit<Place, 'id' | 'createdAt'>;

type Row = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  notes: string;
  source: string;
  created_at: number;
};

const fromRow = (r: Row): Place => ({
  id: r.id,
  name: r.name,
  latitude: r.latitude,
  longitude: r.longitude,
  accuracy: r.accuracy,
  notes: r.notes,
  source: r.source,
  createdAt: r.created_at,
});

export async function listPlaces(db: SQLiteDatabase): Promise<Place[]> {
  const rows = await db.getAllAsync<Row>('SELECT * FROM locations ORDER BY name COLLATE NOCASE');
  return rows.map(fromRow);
}

export async function getPlace(db: SQLiteDatabase, id: number): Promise<Place | null> {
  const row = await db.getFirstAsync<Row>('SELECT * FROM locations WHERE id = ?', id);
  return row ? fromRow(row) : null;
}

export async function addPlace(db: SQLiteDatabase, place: NewPlace): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO locations (name, latitude, longitude, accuracy, notes, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    place.name,
    place.latitude,
    place.longitude,
    place.accuracy,
    place.notes,
    place.source,
    Date.now(),
  );
  return result.lastInsertRowId;
}

export async function updatePlace(db: SQLiteDatabase, id: number, place: NewPlace): Promise<void> {
  await db.runAsync(
    'UPDATE locations SET name = ?, latitude = ?, longitude = ?, accuracy = ?, notes = ?, source = ? WHERE id = ?',
    place.name,
    place.latitude,
    place.longitude,
    place.accuracy,
    place.notes,
    place.source,
    id,
  );
}

export async function deletePlace(db: SQLiteDatabase, id: number): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM finds WHERE place_id = ?', id);
    await db.runAsync('DELETE FROM locations WHERE id = ?', id);
  });
}

/** True if a place with the same name already exists within ~1 m of these coordinates. */
export async function hasDuplicate(db: SQLiteDatabase, place: Pick<Place, 'name' | 'latitude' | 'longitude'>) {
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM locations WHERE name = ? AND ABS(latitude - ?) < 0.00001 AND ABS(longitude - ?) < 0.00001',
    place.name,
    place.latitude,
    place.longitude,
  );
  return (row?.n ?? 0) > 0;
}

/**
 * Adds places received from elsewhere (Bluetooth or a file), skipping ones that are
 * already saved (same name and coordinates). `source` records where they came from.
 */
export async function importPlaces(
  db: SQLiteDatabase,
  places: Omit<NewPlace, 'source'>[],
  source: string,
): Promise<{ added: number; skipped: number }> {
  let added = 0;
  let skipped = 0;
  for (const place of places) {
    if (await hasDuplicate(db, place)) {
      skipped++;
      continue;
    }
    await addPlace(db, { ...place, source });
    added++;
  }
  return { added, skipped };
}
