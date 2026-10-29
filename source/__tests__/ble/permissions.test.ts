import { PermissionsAndroid, Platform } from 'react-native';

import { requestBluetoothPermissions } from '../../src/ble/permissions';

const setPlatform = (os: string, version: number) => {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
  Object.defineProperty(Platform, 'Version', { value: version, configurable: true });
};

describe('requestBluetoothPermissions', () => {
  const request = jest.spyOn(PermissionsAndroid, 'requestMultiple');
  afterEach(() => request.mockReset());

  it('asks for scan/connect/advertise on Android 12+', async () => {
    setPlatform('android', 33);
    request.mockImplementation(async (perms) => Object.fromEntries(perms.map((p) => [p, 'granted'])) as never);
    await expect(requestBluetoothPermissions()).resolves.toBe(true);
    expect(request.mock.calls[0][0]).toEqual([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
    ]);
  });

  it('asks for fine location on older Android and reports denial', async () => {
    setPlatform('android', 29);
    request.mockImplementation(async (perms) => Object.fromEntries(perms.map((p) => [p, 'denied'])) as never);
    await expect(requestBluetoothPermissions()).resolves.toBe(false);
    expect(request.mock.calls[0][0]).toEqual([PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]);
  });

  it('is unsupported off Android', async () => {
    setPlatform('ios', 17);
    await expect(requestBluetoothPermissions()).resolves.toBe(false);
    expect(request).not.toHaveBeenCalled();
  });
});
