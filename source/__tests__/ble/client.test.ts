import { encodeInfo, encodeItem, INDEX_UUID, INFO_UUID, ITEM_UUID, NAME_UUID, SERVICE_UUID } from '../../src/ble/protocol';
import { base64ToText, textToBase64 } from '../../src/lib/base64';
import { bleState, managerMethods, setBluetoothState } from '../helpers/bleMock';

import * as clientModule from '../../src/ble/client';

// The client keeps one module-level BleManager; the mock's methods are shared, so that's fine.
const loadClient = () => clientModule;

function fakeDevice(items: string[], name = 'Alex') {
  let index = 0;
  const device = {
    discoverAllServicesAndCharacteristics: jest.fn(async () => {}),
    readCharacteristicForService: jest.fn(async (service: string, char: string) => {
      expect(service).toBe(SERVICE_UUID);
      if (char === INFO_UUID) return { value: textToBase64(encodeInfo(name, items.length)) };
      expect(char).toBe(ITEM_UUID);
      return { value: textToBase64(items[index]) };
    }),
    writtenName: null as string | null,
    writeCharacteristicWithResponseForService: jest.fn(async function (
      this: { writtenName: string | null },
      _s: string,
      char: string,
      value: string,
    ) {
      if (char === NAME_UUID) {
        device.writtenName = base64ToText(value);
        return;
      }
      expect(char).toBe(INDEX_UUID);
      index = Number(base64ToText(value));
    }),
    cancelConnection: jest.fn(async () => {}),
  };
  return device;
}

test('bluetoothState and onBluetoothStateChange', async () => {
  const client = loadClient();
  await expect(client.bluetoothState()).resolves.toBe('PoweredOn');
  const listener = jest.fn();
  const sub = client.onBluetoothStateChange(listener);
  expect(listener).toHaveBeenCalledWith('PoweredOn');
  setBluetoothState('PoweredOff');
  expect(listener).toHaveBeenLastCalledWith('PoweredOff');
  sub.remove();
});

describe('scanForNearbyUsers', () => {
  it('reports devices with their advertised name, or a default', async () => {
    const client = loadClient();
    const onUser = jest.fn();
    const stop = client.scanForNearbyUsers(onUser, jest.fn());
    expect(managerMethods.startDeviceScan.mock.calls[0][0]).toEqual([SERVICE_UUID]);
    bleState.scanCallback!(null, { id: 'd1', rssi: -50, serviceData: { [SERVICE_UUID.toUpperCase()]: textToBase64('Alex') } });
    bleState.scanCallback!(null, { id: 'd2', rssi: null, serviceData: null });
    bleState.scanCallback!(null, { id: 'd3', rssi: -80, serviceData: { [SERVICE_UUID]: textToBase64('   ') } });
    bleState.scanCallback!(null, null);
    expect(onUser.mock.calls.map((c) => [c[0].id, c[0].name, c[0].rssi])).toEqual([
      ['d1', 'Alex', -50],
      ['d2', 'FindIt user', null],
      ['d3', 'FindIt user', -80],
    ]);
    stop();
    expect(managerMethods.stopDeviceScan).toHaveBeenCalled();
  });

  it('reports scan errors from the callback and from starting the scan', async () => {
    const client = loadClient();
    const onError = jest.fn();
    client.scanForNearbyUsers(jest.fn(), onError);
    bleState.scanCallback!({ message: 'Location services off' }, null);
    expect(onError).toHaveBeenCalledWith('Location services off');

    managerMethods.startDeviceScan.mockRejectedValueOnce(new Error('BT off')).mockRejectedValueOnce('weird');
    client.scanForNearbyUsers(jest.fn(), onError);
    client.scanForNearbyUsers(jest.fn(), onError);
    await new Promise((r) => setImmediate(r));
    expect(onError).toHaveBeenCalledWith('BT off');
    expect(onError).toHaveBeenCalledWith('weird');
  });
});

describe('fetchSharedPlaces', () => {
  it('downloads every item and disconnects', async () => {
    const client = loadClient();
    const items = [
      encodeItem({ name: 'A', latitude: 1, longitude: 2, accuracy: 3, notes: '' }),
      encodeItem({ name: 'B', latitude: 4, longitude: 5, accuracy: null, notes: 'n' }),
    ];
    const device = fakeDevice(items);
    bleState.device = device;
    const progress = jest.fn();
    const result = await client.fetchSharedPlaces('d1', progress);
    expect(managerMethods.connectToDevice).toHaveBeenCalledWith('d1', expect.objectContaining({ requestMTU: 512 }));
    expect(result.from).toBe('Alex');
    expect(result.places.map((p) => p.name)).toEqual(['A', 'B']);
    expect(progress.mock.calls).toEqual([
      [0, 2],
      [1, 2],
      [2, 2],
    ]);
    expect(device.cancelConnection).toHaveBeenCalled();
  });

  it('ignores failures to stop scanning', async () => {
    const client = loadClient();
    managerMethods.stopDeviceScan.mockRejectedValue(new Error('not scanning'));
    const stop = client.scanForNearbyUsers(jest.fn(), jest.fn());
    stop();
    bleState.device = fakeDevice([]);
    await expect(client.fetchSharedPlaces('d1')).resolves.toEqual({ from: 'Alex', places: [] });
    await new Promise((r) => setImmediate(r));
  });

  it('fails on an empty item value', async () => {
    const client = loadClient();
    const device = fakeDevice(['x']);
    device.readCharacteristicForService
      .mockImplementationOnce(async () => ({ value: textToBase64(encodeInfo('Alex', 1)) }))
      .mockImplementationOnce(async () => ({ value: null }) as never);
    bleState.device = device;
    await expect(client.fetchSharedPlaces('d1')).rejects.toThrow();
  });

  it('disconnects even when reading fails, and handles empty values', async () => {
    const client = loadClient();
    const device = fakeDevice([]);
    device.readCharacteristicForService.mockResolvedValueOnce({ value: null } as never);
    device.cancelConnection.mockRejectedValueOnce(new Error('already gone'));
    bleState.device = device;
    await expect(client.fetchSharedPlaces('d1')).rejects.toThrow();
    expect(device.cancelConnection).toHaveBeenCalled();
  });
});

describe('sending my name (protocol v2)', () => {
  it('tells the sharing phone who is downloading', async () => {
    const client = loadClient();
    const device = fakeDevice([]);
    bleState.device = device;
    await client.fetchSharedPlaces('d1', undefined, '  Gerald ');
    expect(device.writtenName).toBe('Gerald');
  });

  it('still works with an older FindIt that has no name characteristic', async () => {
    const client = loadClient();
    const device = fakeDevice([encodeItem({ name: 'A', latitude: 1, longitude: 2, accuracy: null, notes: '' })]);
    const original = device.writeCharacteristicWithResponseForService.getMockImplementation()!;
    device.writeCharacteristicWithResponseForService.mockImplementation(async (s: string, char: string, value: string) => {
      if (char === NAME_UUID) throw new Error('Characteristic not found');
      return original.call(device, s, char, value);
    });
    bleState.device = device;
    await expect(client.fetchSharedPlaces('d1', undefined, 'Gerald')).resolves.toMatchObject({ from: 'Alex' });
  });
});
