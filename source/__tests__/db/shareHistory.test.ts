import {
  addShare,
  clearShareHistory,
  HISTORY_RETENTION_OPTIONS,
  listShareHistory,
  pruneShareHistory,
  retentionLabel,
} from '../../src/db/shareHistory';
import { createTestDb, type TestDb } from '../helpers/testDb';

const DAY = 24 * 60 * 60 * 1000;

let db: TestDb;
beforeEach(async () => {
  db = await createTestDb();
});
afterEach(() => db.close());

test('the schema has a share_history table', async () => {
  expect(await db.getAllAsync("SELECT name FROM sqlite_master WHERE name = 'share_history'")).toHaveLength(1);
});

test('records shares and lists them newest first', async () => {
  await addShare(db as never, { at: 1000, name: 'Alex', places: 3 });
  await addShare(db as never, { at: 5000, name: 'Sam', places: 1 });
  await addShare(db as never, { at: 5000, name: 'Kim', places: 0 });
  expect((await listShareHistory(db as never)).map((s) => [s.at, s.name, s.places])).toEqual([
    [5000, 'Kim', 0],
    [5000, 'Sam', 1],
    [1000, 'Alex', 3],
  ]);
});

test('prunes entries older than the retention period, and keeps everything when forever', async () => {
  const now = 100 * DAY;
  await addShare(db as never, { at: now - 31 * DAY, name: 'Old', places: 1 });
  await addShare(db as never, { at: now - 29 * DAY, name: 'Recent', places: 1 });
  await pruneShareHistory(db as never, null, now);
  expect(await listShareHistory(db as never)).toHaveLength(2);
  await pruneShareHistory(db as never, 30, now);
  expect((await listShareHistory(db as never)).map((s) => s.name)).toEqual(['Recent']);
});

test('clears the history', async () => {
  await addShare(db as never, { at: 1, name: 'Alex', places: 2 });
  await clearShareHistory(db as never);
  expect(await listShareHistory(db as never)).toEqual([]);
});

test('retention options and labels', () => {
  expect(HISTORY_RETENTION_OPTIONS).toEqual([7, 30, 90, 365, null]);
  expect(HISTORY_RETENTION_OPTIONS.map(retentionLabel)).toEqual(['7 days', '30 days', '90 days', '1 year', 'Forever']);
  expect(retentionLabel(1)).toBe('1 day');
});
