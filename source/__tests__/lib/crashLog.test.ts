import { AppState } from 'react-native';

import { clearDebugLog, debugLog, flushDebugLog, readDebugLog, setDebugLogging } from '../../src/lib/debugLog';
import { checkPreviousRun, installCrashLogging, logAppState, logCrashes, logRejections, resetPreviousRunCheck } from '../../src/lib/crashLog';
import { createTestDb, type TestDb } from '../helpers/testDb';

let db: TestDb;
beforeEach(async () => {
  db = await createTestDb();
  setDebugLogging(db as never, true);
  resetPreviousRunCheck();
});
afterEach(() => {
  setDebugLogging(null, false);
  db.close();
  jest.restoreAllMocks();
});
const messages = async () => {
  await flushDebugLog();
  return (await readDebugLog(db as never)).reverse().map((e) => `[${e.tag}] ${e.message}`);
};

describe('logCrashes', () => {
  it('writes an uncaught error to the debug log, then hands it on to the normal handler', async () => {
    const previous = jest.fn();
    const utils = ErrorUtils;
    jest.spyOn(utils, 'getGlobalHandler').mockReturnValue(previous);
    const set = jest.spyOn(utils, 'setGlobalHandler').mockImplementation(() => {});
    const uninstall = logCrashes();
    const handler = set.mock.calls[0][0];
    const error = Object.assign(new Error('boom'), { stack: 'Error: boom\n  at a\n  at b' });
    handler(error, true);
    await flushDebugLog();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(previous).toHaveBeenCalledWith(error, true);
    expect((await messages())[0]).toBe('[crash] Fatal error: boom\nError: boom\n  at a\n  at b');
    uninstall();
    expect(set).toHaveBeenLastCalledWith(previous);
  });

  it('labels a non-fatal error and copes with a missing stack', async () => {
    const previous = jest.fn();
    jest.spyOn(ErrorUtils, 'getGlobalHandler').mockReturnValue(previous);
    const set = jest.spyOn(ErrorUtils, 'setGlobalHandler').mockImplementation(() => {});
    logCrashes();
    const error = new Error('soft');
    error.stack = undefined;
    set.mock.calls[0][0](error, false);
    await flushDebugLog();
    expect((await messages())[0]).toBe('[crash] Uncaught error: soft\n');
  });

  it('does nothing where ErrorUtils is missing', () => {
    const utils = ErrorUtils;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).ErrorUtils = undefined;
    try {
      expect(() => logCrashes()()).not.toThrow();
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).ErrorUtils = utils;
    }
  });
});

describe('logAppState', () => {
  it('records when the app moves to the background, and stops listening when removed', async () => {
    const remove = jest.fn();
    const add = jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove } as never);
    const stop = logAppState();
    const listener = add.mock.calls[0][1] as (state: string) => void;
    listener('active');
    listener('background');
    expect(await messages()).toEqual(['[app] Moved to the background']);
    stop();
    expect(remove).toHaveBeenCalled();
  });
});

describe('checkPreviousRun', () => {
  it('says nothing on a first run or when the last run ended in the background', async () => {
    await checkPreviousRun(db as never);
    expect(await messages()).toEqual([]);
    debugLog('app', 'Moved to the background');
    await flushDebugLog();
    resetPreviousRunCheck();
    await checkPreviousRun(db as never);
    expect(await messages()).toEqual(['[app] Moved to the background']);
  });

  it('flags a previous run that did not end in the background, once per start', async () => {
    debugLog('gps', 'Fix accurate to 5 m');
    await flushDebugLog();
    await checkPreviousRun(db as never);
    await checkPreviousRun(db as never);
    expect(await messages()).toEqual([
      '[gps] Fix accurate to 5 m',
      '[app] The previous run did not end in the background: the app probably crashed, or was closed while in use',
    ]);
  });

  it('is quiet after the log was cleared', async () => {
    debugLog('gps', 'x');
    await flushDebugLog();
    await clearDebugLog(db as never);
    await checkPreviousRun(db as never);
    expect(await messages()).toEqual([]);
  });
});

describe('logRejections', () => {
  afterEach(() => {
    delete (globalThis as { HermesInternal?: unknown }).HermesInternal;
  });

  it('logs promise rejections nobody handled', async () => {
    const enable = jest.fn();
    (globalThis as { HermesInternal?: unknown }).HermesInternal = { enablePromiseRejectionTracker: enable };
    logRejections();
    const options = enable.mock.calls[0][0] as { allRejections: boolean; onUnhandled: (id: number, error: unknown) => void };
    expect(options.allRejections).toBe(true);
    options.onUnhandled(1, Object.assign(new Error('no handler'), { stack: 'Error: no handler\n  at x' }));
    options.onUnhandled(2, 'plain text');
    expect(await messages()).toEqual([
      '[crash] Unhandled promise rejection: no handler\nError: no handler\n  at x',
      '[crash] Unhandled promise rejection: plain text\n',
    ]);
  });

  it('does nothing without Hermes', () => {
    expect(() => logRejections()).not.toThrow();
  });
});

describe('installCrashLogging', () => {
  it('installs the error handler once', () => {
    const set = jest.spyOn(ErrorUtils, 'setGlobalHandler').mockImplementation(() => {});
    jest.spyOn(ErrorUtils, 'getGlobalHandler').mockReturnValue(jest.fn());
    installCrashLogging();
    installCrashLogging();
    expect(set).toHaveBeenCalledTimes(1);
  });
});
