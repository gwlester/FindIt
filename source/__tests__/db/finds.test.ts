import { findSummaries, foundLabel, listFinds, recordFind, summarizeFinds } from '../../src/db/finds';
import { addPlace, deletePlace, importPlaces, listPlaces, placesForExport } from '../../src/db/locations';
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

test('the schema has a finds table', async () => {
  expect(await db.getFirstAsync('PRAGMA user_version')).toEqual({ user_version: 3 });
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
  expect(summaries.get(oak)).toEqual({
    count: 2,
    myCount: 2,
    myLastFoundAt: 4000,
    lastFoundAt: 4000,
    lastFinder: '',
    lastComment: 'x',
  });
  expect(summaries.get(elm)).toEqual({
    count: 1,
    myCount: 0,
    myLastFoundAt: null,
    lastFoundAt: 2000,
    lastFinder: 'Alex',
    lastComment: '',
  });
  expect(summaries.size).toBe(2);
});

describe('summarizeFinds and foundLabel', () => {
  const find = (foundAt: number, finder = '', comment = '') => ({ id: foundAt, placeId: 1, foundAt, comment, finder });
  const day = (d: number) => new Date(2026, 9, d).getTime();

  it('describes my finds first, then other people’s', () => {
    expect(summarizeFinds([])).toBeNull();
    expect(foundLabel(null)).toBeNull();
    expect(foundLabel(summarizeFinds([find(day(20))]))).toBe('Found 2026-10-20');
    expect(foundLabel(summarizeFinds([find(day(22), 'Alex'), find(day(21)), find(day(20))]))).toBe(
      'Found 2 times, last 2026-10-21',
    );
    expect(foundLabel(summarizeFinds([find(day(22), 'Alex'), find(day(19), 'Jo')]))).toBe('Found by Alex 2026-10-22');
  });

  it("uses my latest find's comment when I've found it", () => {
    expect(summarizeFinds([find(day(22), 'Alex', 'theirs'), find(day(21), '', 'mine')])!.lastComment).toBe('mine');
    expect(summarizeFinds([find(day(22), 'Alex', 'theirs')])!.lastComment).toBe('theirs');
  });
});

test('deleting a place deletes its finds', async () => {
  await recordFind(db as never, oak, { foundAt: 1000, comment: '' }, 'log');
  await deletePlace(db as never, oak);
  expect(await db.getAllAsync('SELECT * FROM finds')).toEqual([]);
});

test('settings: found places mode (default once) and hiding found places', async () => {
  expect(await loadSettings(db as never)).toMatchObject({ findMode: 'once', hideFound: false, shareHistoryDays: 90 });
  await saveSettings(db as never, { ...DEFAULT_SETTINGS, findMode: 'log', hideFound: true, shareHistoryDays: 90 });
  expect(await loadSettings(db as never)).toMatchObject({ findMode: 'log', hideFound: true, shareHistoryDays: 90 });
  await saveSettings(db as never, { ...DEFAULT_SETTINGS, findMode: 'off' });
  expect((await loadSettings(db as never)).findMode).toBe('off');
  await db.runAsync("UPDATE settings SET value = 'weird' WHERE key = 'findMode'");
  expect((await loadSettings(db as never)).findMode).toBe('once');
});

describe('importing and exporting finds', () => {
  const incoming = (name: string, finds = [{ foundAt: 5000, comment: 'c', finder: '' }]) => ({
    name,
    latitude: 3,
    longitude: 4,
    accuracy: null,
    notes: '',
    finds,
  });

  it('records the finds of imported places; "mine" stays mine from a file', async () => {
    await importPlaces(db as never, [incoming('Elm')], 'caches.gpx');
    const elm = (await listPlaces(db as never)).find((p) => p.name === 'Elm')!;
    expect((await listFinds(db as never, elm.id)).map((f) => [f.foundAt, f.comment, f.finder])).toEqual([[5000, 'c', '']]);
  });

  it("labels the sender's own finds with their name when received by Bluetooth", async () => {
    await importPlaces(
      db as never,
      [incoming('Elm', [{ foundAt: 5000, comment: '', finder: '' }, { foundAt: 4000, comment: '', finder: 'Jo' }])],
      'Alex',
      { ownFindsBy: 'Alex' },
    );
    const elm = (await listPlaces(db as never)).find((p) => p.name === 'Elm')!;
    expect((await listFinds(db as never, elm.id)).map((f) => f.finder)).toEqual(['Alex', 'Jo']);
  });

  it('exports places with their finds only when asked', async () => {
    await recordFind(db as never, oak, { foundAt: 1000, comment: 'x' }, 'log');
    const [place] = await listPlaces(db as never);
    expect((await placesForExport(db as never, [place], false))[0].finds).toBeUndefined();
    const [withFinds] = await placesForExport(db as never, [place], true);
    expect(withFinds).toMatchObject({ name: 'Oak', createdAt: place.createdAt });
    expect(withFinds.finds).toEqual([{ foundAt: 1000, comment: 'x', finder: '' }]);
  });
});
