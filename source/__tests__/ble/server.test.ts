import { isSharing, onSharePeer, startSharing, stopSharing } from '../../src/ble/server';
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
