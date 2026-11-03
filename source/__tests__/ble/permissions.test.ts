import { PermissionsAndroid, Platform } from 'react-native';

import * as Location from 'expo-location';

import { prepareToScan, requestBluetoothPermissions } from '../../src/ble/permissions';
import { flushDebugLog, readDebugLog, setDebugLogging } from '../../src/lib/debugLog';
import { createTestDb } from '../helpers/testDb';

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

describe('prepareToScan (receiving: Android also needs precise location to report nearby devices)', () => {
  const request = jest.spyOn(PermissionsAndroid, 'requestMultiple');
  const P = PermissionsAndroid.PERMISSIONS;
  const answer = (denied: string[] = []) =>
    request.mockImplementation(async (perms) => Object.fromEntries(perms.map((p) => [p, denied.includes(p) ? 'denied' : 'granted'])) as never);
  afterEach(() => {
    request.mockReset();
    setDebugLogging(null, false);
  });

  it('on Android 12+ asks for the Bluetooth permissions and precise location, and checks Location is on', async () => {
    setPlatform('android', 34);
    answer();
    await expect(prepareToScan()).resolves.toEqual({ ok: true });
    expect(request.mock.calls[0][0]).toEqual([P.BLUETOOTH_SCAN, P.BLUETOOTH_CONNECT, P.BLUETOOTH_ADVERTISE, P.ACCESS_FINE_LOCATION]);
    expect(Location.hasServicesEnabledAsync).toHaveBeenCalled();
  });

  it('explains a missing Bluetooth permission', async () => {
    setPlatform('android', 34);
    answer([P.BLUETOOTH_SCAN]);
    await expect(prepareToScan()).resolves.toMatchObject({ ok: false, title: 'Bluetooth permission needed' });
  });

  it('explains that approximate location is not enough', async () => {
    setPlatform('android', 34);
    answer([P.ACCESS_FINE_LOCATION]);
    const result = await prepareToScan();
    expect(result).toMatchObject({ ok: false, title: 'Precise location needed' });
    expect((result as { message: string }).message).toMatch(/Use precise location/);
  });

  it('asks to turn Location on', async () => {
    setPlatform('android', 34);
    answer();
    jest.mocked(Location.hasServicesEnabledAsync).mockResolvedValueOnce(false);
    await expect(prepareToScan()).resolves.toMatchObject({ ok: false, title: 'Turn on Location' });
  });

  it('on older Android needs location permission', async () => {
    setPlatform('android', 29);
    answer([P.ACCESS_FINE_LOCATION]);
    await expect(prepareToScan()).resolves.toMatchObject({ ok: false, title: 'Location permission needed' });
    expect(request.mock.calls[0][0]).toEqual([P.ACCESS_FINE_LOCATION]);
    answer();
    await expect(prepareToScan()).resolves.toEqual({ ok: true });
  });

  it('is unsupported off Android', async () => {
    setPlatform('ios', 17);
    await expect(prepareToScan()).resolves.toMatchObject({ ok: false, title: 'Bluetooth unavailable' });
  });

  it('writes every answer to the debug log', async () => {
    const db = await createTestDb();
    setDebugLogging(db as never, true);
    setPlatform('android', 34);
    answer([P.ACCESS_FINE_LOCATION]);
    await prepareToScan();
    await flushDebugLog();
    const messages = (await readDebugLog(db as never)).map((e) => `[${e.tag}] ${e.message}`);
    expect(messages.join('\n')).toMatch(/\[permissions\] Android API 34: .*ACCESS_FINE_LOCATION=denied/);
    db.close();
  });
});
