import { isSharing, onShareLog, onSharePeer, startSharing, stopSharing } from '../../src/ble/server';
import { flushDebugLog, readDebugLog, setDebugLogging } from '../../src/lib/debugLog';
import { createTestDb, type TestDb } from '../helpers/testDb';
import { decodeInfo, decodeItem } from '../../src/ble/protocol';
import { emitNative, nativeMock } from '../helpers/nativeModuleMock';

const PLACE = { name: 'A', latitude: 1, longitude: 2, accuracy: null, notes: '' };

test('startSharing encodes info and items for the native server', async () => {
  await startSharing('Gerald', [PLACE, { ...PLACE, name: 'B' }]);
  const [name, info, items] = nativeMock.startSharing.mock.calls[0];
  expect(name).toBe('Gerald');
  expect(decodeInfo(info)).toMatchObject({ name: 'Gerald', count: 2 });
  expect(items.map((i: string) => decodeItem(i).name)).toEqual(['A', 'B']);
});

test('stopSharing / isSharing / onSharePeer delegate to the native module', async () => {
  await stopSharing();
  expect(nativeMock.stopSharing).toHaveBeenCalled();
  nativeMock.isSharing.mockReturnValue(true);
  expect(isSharing()).toBe(true);
  const listener = jest.fn();
  const sub = onSharePeer(listener);
  emitNative('onSharePeer', { address: 'AA', state: 'connected' });
  expect(listener).toHaveBeenCalledWith({ address: 'AA', state: 'connected' });
  sub.remove();
});

describe('debug log', () => {
  let db: TestDb;
  const logged = async () => {
    await flushDebugLog();
    return (await readDebugLog(db as never)).reverse().map((e) => `[${e.tag}] ${e.message}`);
  };
  beforeEach(async () => {
    db = await createTestDb();
    setDebugLogging(db as never, true);
  });
  afterEach(() => {
    setDebugLogging(null, false);
    db.close();
  });

  it('records starting, failing and stopping', async () => {
    await startSharing('Gerald', [PLACE]);
    nativeMock.startSharing.mockRejectedValueOnce(new Error('Too many apps are advertising over Bluetooth'));
    await expect(startSharing('Gerald', [PLACE])).rejects.toThrow('Too many');
    await stopSharing();
    expect(await logged()).toEqual([
      expect.stringMatching(/^\[share\] Starting as "Gerald" \(6 bytes; 13 fit in the advertisement\), 1 place, largest \d+ bytes$/),
      '[share] Sharing started',
      expect.stringMatching(/^\[share\] Starting as "Gerald"/),
      '[share] Sharing could not start: Too many apps are advertising over Bluetooth',
      '[share] Sharing stopped',
    ]);
  });

  it('passes on what the native server reports', async () => {
    const listener = jest.fn();
    const sub = onShareLog(listener);
    emitNative('onShareLog', { message: 'Advertising started' });
    expect(listener).toHaveBeenCalledWith('Advertising started');
    sub.remove();
  });
});
