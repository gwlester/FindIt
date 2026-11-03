import * as Location from 'expo-location';
import { PermissionsAndroid, Platform, type Permission } from 'react-native';

import { debugLog } from '../lib/debugLog';

const P = PermissionsAndroid.PERMISSIONS;
const BLUETOOTH_12: Permission[] = [P.BLUETOOTH_SCAN, P.BLUETOOTH_CONNECT, P.BLUETOOTH_ADVERTISE];

async function request(permissions: Permission[]) {
  const result = await PermissionsAndroid.requestMultiple(permissions);
  debugLog(
    'permissions',
    `Android API ${Platform.Version}: ${permissions.map((p) => `${p.replace('android.permission.', '')}=${result[p]}`).join(', ')}`,
  );
  return (p: Permission) => result[p] === PermissionsAndroid.RESULTS.GRANTED;
}

/** Requests the runtime permissions needed to scan, connect and advertise over BLE. */
export async function requestBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const permissions = Number(Platform.Version) >= 31 ? BLUETOOTH_12 : [P.ACCESS_FINE_LOCATION];
  const granted = await request(permissions);
  return permissions.every(granted);
}

export type ScanCheck = { ok: true } | { ok: false; title: string; message: string };

/**
 * Everything needed before looking for nearby users. Besides the Bluetooth permissions,
 * Android only reports nearby devices to this app with *precise* location granted and
 * Location turned on; without them a scan silently finds nobody.
 */
export async function prepareToScan(): Promise<ScanCheck> {
  if (Platform.OS !== 'android') {
    return { ok: false, title: 'Bluetooth unavailable', message: 'Sharing nearby needs Android.' };
  }
  const modern = Number(Platform.Version) >= 31;
  const granted = await request(modern ? [...BLUETOOTH_12, P.ACCESS_FINE_LOCATION] : [P.ACCESS_FINE_LOCATION]);
  if (modern && !BLUETOOTH_12.every(granted)) {
    return { ok: false, title: 'Bluetooth permission needed', message: 'Allow "Nearby devices" to find other FindCache users.' };
  }
  if (!granted(P.ACCESS_FINE_LOCATION)) {
    return modern
      ? {
          ok: false,
          title: 'Precise location needed',
          message:
            'Android only lets apps find nearby Bluetooth devices with precise location. Allow it when asked, or turn on ' +
            'Settings → Apps → FindCache → Permissions → Location → Use precise location.',
        }
      : { ok: false, title: 'Location permission needed', message: 'Android needs location permission to find nearby Bluetooth devices.' };
  }
  const locationOn = await Location.hasServicesEnabledAsync();
  debugLog('permissions', `Location services ${locationOn ? 'on' : 'off'}`);
  if (!locationOn) {
    return { ok: false, title: 'Turn on Location', message: 'Android needs Location turned on to find nearby Bluetooth devices.' };
  }
  return { ok: true };
}
