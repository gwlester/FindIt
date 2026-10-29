import { findSummaries, listFinds, recordFind } from '../../src/db/finds';
import { addPlace, deletePlace } from '../../src/db/locations';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../../src/db/settings';
import { createTestDb, type TestDb } from '../helpers/testDb';

const PLACE = { name: 'Oak', latitude: 1, longitude: 2, accuracy: null, notes: '', source: 'local' };

let db: TestDb;
let oak: number;
beforeEach(async () => {
  db = await createTestDb();
  oak = await addPlace(db as never, PLACE);
});
afterEach(() => db.close());

test('the schema is at version 2 with a finds table', async () => {
  expect(await db.getFirstAsync('PRAGMA user_version')).toEqual({ user_version: 2 });
  expect(await db.getAllAsync("SELECT name FROM sqlite_master WHERE name = 'finds'")).toHaveLength(1);
});

describe('recordFind', () => {
  it('in log mode adds an entry each time, newest first', async () => {
    await recordFind(db as never, oak, { foundAt: 1000, comment: 'first' }, 'log');
    await recordFind(db as never, oak, { foundAt: 3000, comment: '' }, 'log');
    expect((await listFinds(db as never, oak)).map((f) => [f.foundAt, f.comment, f.finder])).toEqual([
      [3000, '', ''],
      [1000, 'first', ''],
    ]);
  });

  it('in once mode updates the latest find instead of adding one, keeping the older log', async () => {
    await recordFind(db as never, oak, { foundAt: 1000, comment: 'a' }, 'log');
    await recordFind(db as never, oak, { foundAt: 2000, comment: 'b' }, 'log');
    await recordFind(db as never, oak, { foundAt: 5000, comment: 'again' }, 'once');
    expect((await listFinds(db as never, oak)).map((f) => [f.foundAt, f.comment])).toEqual([
      [5000, 'again'],
      [1000, 'a'],
    ]);
  });

  it('in once mode adds the first find', async () => {
    await recordFind(db as never, oak, { foundAt: 1000, comment: '' }, 'once');
    expect(await listFinds(db as never, oak)).toHaveLength(1);
  });

  it("records someone else's find with their name, and once mode only replaces my own", async () => {
    await recordFind(db as never, oak, { foundAt: 1000, comment: 'by Alex', finder: 'Alex' }, 'log');
    await recordFind(db as never, oak, { foundAt: 2000, comment: 'mine' }, 'once');
    await recordFind(db as never, oak, { foundAt: 3000, comment: 'mine again' }, 'once');
    expect((await listFinds(db as never, oak)).map((f) => [f.finder, f.comment])).toEqual([
      ['', 'mine again'],
      ['Alex', 'by Alex'],
    ]);
  });
});

test('findSummaries gives the count and my latest find per place', async () => {
  const elm = await addPlace(db as never, { ...PLACE, name: 'Elm' });
  await addPlace(db as never, { ...PLACE, name: 'Ash' });
  await recordFind(db as never, oak, { foundAt: 1000, comment: '' }, 'log');
  await recordFind(db as never, oak, { foundAt: 4000, comment: 'x' }, 'log');
  await recordFind(db as never, elm, { foundAt: 2000, comment: '', finder: 'Alex' }, 'log');
  const summaries = await findSummaries(db as never);
  expect(summaries.get(oak)).toEqual({ count: 2, lastFoundAt: 4000, lastComment: 'x', foundByMe: true });
  expect(summaries.get(elm)).toEqual({ count: 1, lastFoundAt: 2000, lastComment: '', foundByMe: false });
  expect(summaries.size).toBe(2);
});

test('deleting a place deletes its finds', async () => {
  await recordFind(db as never, oak, { foundAt: 1000, comment: '' }, 'log');
  await deletePlace(db as never, oak);
  expect(await db.getAllAsync('SELECT * FROM finds')).toEqual([]);
});

test('settings: found places mode (default once) and hiding found places', async () => {
  expect(await loadSettings(db as never)).toMatchObject({ findMode: 'once', hideFound: false });
  await saveSettings(db as never, { ...DEFAULT_SETTINGS, findMode: 'log', hideFound: true });
  expect(await loadSettings(db as never)).toMatchObject({ findMode: 'log', hideFound: true });
  await saveSettings(db as never, { ...DEFAULT_SETTINGS, findMode: 'off' });
  expect((await loadSettings(db as never)).findMode).toBe('off');
  await db.runAsync("UPDATE settings SET value = 'weird' WHERE key = 'findMode'");
  expect((await loadSettings(db as never)).findMode).toBe('once');
});
