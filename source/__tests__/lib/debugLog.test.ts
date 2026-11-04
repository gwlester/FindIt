import {
  clearDebugLog,
  debugLog,
  debugLogThrottled,
  flushDebugLog,
  formatDebugLog,
  isDebugLogging,
  MAX_DEBUG_ENTRIES,
  readDebugLog,
  setDebugLogging,
} from '../../src/lib/debugLog';
import { createTestDb, type TestDb } from '../helpers/testDb';

let db: TestDb;
beforeEach(async () => {
  db = await createTestDb();
});
afterEach(() => {
  setDebugLogging(null, false);
  db.close();
});

test('records nothing while logging is off', async () => {
  setDebugLogging(db as never, false);
  expect(isDebugLogging()).toBe(false);
  debugLog('ble', 'ignored');
  await flushDebugLog();
  expect(await readDebugLog(db as never)).toEqual([]);
});

test('keeps crash entries made before logging was switched on, and writes them once it is', async () => {
  debugLog('crash', 'early failure', 1000);
  debugLog('ble', 'not a crash', 1000);
  setDebugLogging(db as never, true);
  await flushDebugLog();
  expect((await readDebugLog(db as never)).map((e) => [e.tag, e.message])).toEqual([['crash', 'early failure']]);
});

test('drops early crash entries when logging stays off', async () => {
  debugLog('crash', 'early failure');
  setDebugLogging(db as never, false);
  setDebugLogging(db as never, true);
  await flushDebugLog();
  expect(await readDebugLog(db as never)).toEqual([]);
});

test('holds only a few early crash entries', async () => {
  for (let i = 0; i < 30; i++) debugLog('crash', `c${i}`);
  setDebugLogging(db as never, true);
  await flushDebugLog();
  expect(await readDebugLog(db as never)).toHaveLength(20);
});

test('records entries in order and reads them newest first', async () => {
  setDebugLogging(db as never, true);
  expect(isDebugLogging()).toBe(true);
  debugLog('ble', 'first', 1000);
  debugLog('share', 'second', 1000);
  debugLog('ble', 'third', 2000);
  await flushDebugLog();
  expect((await readDebugLog(db as never)).map((e) => [e.tag, e.message])).toEqual([
    ['ble', 'third'],
    ['share', 'second'],
    ['ble', 'first'],
  ]);
});

test('keeps only the newest entries', async () => {
  setDebugLogging(db as never, true);
  for (let i = 0; i < MAX_DEBUG_ENTRIES + 5; i++) debugLog('t', `m${i}`);
  await flushDebugLog();
  const entries = await readDebugLog(db as never);
  expect(entries).toHaveLength(MAX_DEBUG_ENTRIES);
  expect(entries[0].message).toBe(`m${MAX_DEBUG_ENTRIES + 4}`);
  expect(entries.at(-1)!.message).toBe('m5');
});

test('formats the log as text, oldest first, with local times', () => {
  const at = new Date(2026, 10, 2, 9, 5, 7, 42).getTime();
  expect(
    formatDebugLog([
      { id: 2, at: at + 1000, tag: 'share', message: 'b' },
      { id: 1, at, tag: 'ble', message: 'a' },
    ]),
  ).toBe('2026-11-02 09:05:07.042 [ble] a\n2026-11-02 09:05:08.042 [share] b\n');
});

test('clears the log', async () => {
  setDebugLogging(db as never, true);
  debugLog('t', 'x');
  await flushDebugLog();
  await clearDebugLog(db as never);
  expect(await readDebugLog(db as never)).toEqual([]);
});

test('a failed write never breaks the app', async () => {
  setDebugLogging(db as never, true);
  const broken = { runAsync: jest.fn(async () => Promise.reject(new Error('closed'))) };
  setDebugLogging(broken as never, true);
  debugLog('t', 'x');
  await expect(flushDebugLog()).resolves.toBeUndefined();
});

test('throttled entries are written at most once per interval for each tag', async () => {
  setDebugLogging(db as never, true);
  debugLogThrottled('gps', 'a', 5000, 1000);
  debugLogThrottled('gps', 'b', 5000, 3000);
  debugLogThrottled('gnss', 'c', 5000, 3000);
  debugLogThrottled('gps', 'd', 5000, 6000);
  await flushDebugLog();
  expect((await readDebugLog(db as never)).map((e) => e.message).reverse()).toEqual(['a', 'c', 'd']);
});
