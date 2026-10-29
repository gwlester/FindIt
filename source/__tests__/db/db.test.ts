import {
  addPlace,
  deletePlace,
  getPlace,
  hasDuplicate,
  importPlaces,
  listPlaces,
  updatePlace,
} from '../../src/db/locations';
import { DATABASE_NAME, migrateDatabase } from '../../src/db/schema';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../../src/db/settings';
import { createRawTestDb, createTestDb, type TestDb } from '../helpers/testDb';

const place = (name: string, extra: Partial<Parameters<typeof addPlace>[1]> = {}) => ({
  name,
  latitude: 30.1,
  longitude: -91.2,
  accuracy: 4,
  notes: '',
  source: 'local',
  ...extra,
});

let db: TestDb;
beforeEach(async () => {
  db = await createTestDb();
});
afterEach(() => db.close());

describe('schema', () => {
  it('names the database and sets user_version', async () => {
    expect(DATABASE_NAME).toBe('findit.db');
    expect(await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version')).toEqual({ user_version: 3 });
  });
  it('is idempotent', async () => {
    await migrateDatabase(db as never);
    expect(await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version')).toEqual({ user_version: 3 });
  });
  it('treats a missing user_version row as version 0', async () => {
    const raw = createRawTestDb();
    const original = raw.getFirstAsync.bind(raw);
    raw.getFirstAsync = (async (sql: string) => (sql.includes('user_version') ? null : original(sql))) as never;
    await migrateDatabase(raw as never);
    expect(await raw.getAllAsync('SELECT name FROM sqlite_master WHERE name = ?', 'locations')).toHaveLength(1);
    raw.close();
  });
});

describe('locations', () => {
  it('adds, lists (by name, case-insensitive), gets, updates and deletes', async () => {
    const id = await addPlace(db as never, place('banana'));
    await addPlace(db as never, place('Apple', { accuracy: null, notes: 'n', source: 'Alex' }));
    const all = await listPlaces(db as never);
    expect(all.map((p) => p.name)).toEqual(['Apple', 'banana']);
    expect(all[0]).toMatchObject({ accuracy: null, notes: 'n', source: 'Alex' });
    expect(typeof all[0].createdAt).toBe('number');

    await updatePlace(db as never, id, place('Cherry', { latitude: 1 }));
    expect(await getPlace(db as never, id)).toMatchObject({ name: 'Cherry', latitude: 1 });

    await deletePlace(db as never, id);
    expect(await getPlace(db as never, id)).toBeNull();
  });

  it('detects duplicates by name and ~1 m position', async () => {
    await addPlace(db as never, place('Oak'));
    expect(await hasDuplicate(db as never, { name: 'Oak', latitude: 30.100001, longitude: -91.2 })).toBe(true);
    expect(await hasDuplicate(db as never, { name: 'Oak', latitude: 30.11, longitude: -91.2 })).toBe(false);
    expect(await hasDuplicate(db as never, { name: 'Elm', latitude: 30.1, longitude: -91.2 })).toBe(false);
  });

  it('treats a missing count row as no duplicate', async () => {
    db.getFirstAsync = (async () => null) as never;
    expect(await hasDuplicate(db as never, { name: 'Oak', latitude: 1, longitude: 2 })).toBe(false);
  });

  it('imports places, skipping duplicates and recording the source', async () => {
    await addPlace(db as never, place('Oak'));
    const { source: _s, ...oak } = place('Oak');
    const { source: _t, ...elm } = place('Elm');
    expect(await importPlaces(db as never, [oak, elm], 'Alex')).toEqual({ added: 1, skipped: 1 });
    expect((await listPlaces(db as never)).find((p) => p.name === 'Elm')?.source).toBe('Alex');
  });
});

describe('settings', () => {
  it('returns defaults when empty', async () => {
    expect(await loadSettings(db as never)).toEqual(DEFAULT_SETTINGS);
  });
  it('saves and reloads every setting', async () => {
    const next = { displayName: 'Gerald', units: 'imperial' as const, highAccuracyGps: false, searchAreaDistanceM: 48.768, findMode: 'once' as const, hideFound: false, shareHistoryDays: 30 };
    await saveSettings(db as never, next);
    expect(await loadSettings(db as never)).toEqual(next);
    await saveSettings(db as never, { ...next, units: 'metric', highAccuracyGps: true });
    expect(await loadSettings(db as never)).toMatchObject({ units: 'metric', highAccuracyGps: true });
  });
  it('stores the search-area distance in metres, or off', async () => {
    expect((await loadSettings(db as never)).searchAreaDistanceM).toBe(50);
    await saveSettings(db as never, { ...DEFAULT_SETTINGS, searchAreaDistanceM: null, findMode: 'once' as const, hideFound: false, shareHistoryDays: 90 });
    expect((await loadSettings(db as never)).searchAreaDistanceM).toBeNull();
    await db.runAsync("UPDATE settings SET value = 'garbage' WHERE key = 'searchAreaDistanceM'");
    expect((await loadSettings(db as never)).searchAreaDistanceM).toBe(50);
  });
  it('keeps sharing history 90 days by default, or forever (null)', async () => {
    expect((await loadSettings(db as never)).shareHistoryDays).toBe(90);
    await saveSettings(db as never, { ...DEFAULT_SETTINGS, shareHistoryDays: null });
    expect((await loadSettings(db as never)).shareHistoryDays).toBeNull();
    await saveSettings(db as never, { ...DEFAULT_SETTINGS, shareHistoryDays: 7 });
    expect((await loadSettings(db as never)).shareHistoryDays).toBe(7);
    await db.runAsync("UPDATE settings SET value = 'garbage' WHERE key = 'shareHistoryDays'");
    expect((await loadSettings(db as never)).shareHistoryDays).toBe(90);
  });

  it('rolls back a failed save', async () => {
    await expect(
      db.withTransactionAsync(async () => {
        await db.runAsync("INSERT INTO settings (key, value) VALUES ('x', 'y')");
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(await db.getAllAsync('SELECT * FROM settings')).toEqual([]);
  });
});
