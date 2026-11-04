import { BleManager, type Device, type Subscription } from 'react-native-ble-plx';

import { base64ToText, textToBase64, utf8ByteLength } from '../lib/base64';
import { debugLog } from '../lib/debugLog';
import {
  decodeInfo,
  decodeItem,
  INDEX_UUID,
  INFO_UUID,
  encodeName,
  ITEM_UUID,
  NAME_UUID,
  SERVICE_UUID,
  type SharedPlace,
} from './protocol';

let manager: BleManager | null = null;
function getManager() {
  manager ??= new BleManager();
  return manager;
}

export type NearbyUser = {
  id: string;
  /** Short name from the advertisement (may be truncated). */
  name: string;
  rssi: number | null;
  lastSeen: number;
};

export async function bluetoothState() {
  return getManager().state();
}

export function onBluetoothStateChange(listener: (state: string) => void): Subscription {
  return getManager().onStateChange((state) => {
    debugLog('ble', `Bluetooth state: ${state}`);
    listener(state);
  }, true);
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

function advertisedName(device: Device): string {
  const data = device.serviceData;
  const key = data && Object.keys(data).find((k) => k.toLowerCase() === SERVICE_UUID);
  if (key && data?.[key]) {
    const name = base64ToText(data[key]).trim();
    if (name) return name;
  }
  return 'FindCache user';
}

/** Scans for nearby devices running FindCache's share service. Call the returned function to stop. */
export function scanForNearbyUsers(
  onUser: (user: NearbyUser) => void,
  onError: (message: string) => void,
): () => void {
  const ble = getManager();
  const seen = new Set<string>();
  debugLog('ble', `Scan started for service ${SERVICE_UUID}`);
  ble
    .startDeviceScan([SERVICE_UUID], { allowDuplicates: true }, async (error, device) => {
      if (error) {
        debugLog('ble', `Scan error: ${error.message}`);
        onError(error.message);
        return;
      }
      if (device) {
        const name = advertisedName(device);
        if (!seen.has(device.id)) {
          seen.add(device.id);
          debugLog('ble', `Found "${name}" (${device.id}), RSSI ${device.rssi}`);
        }
        onUser({ id: device.id, name, rssi: device.rssi, lastSeen: Date.now() });
      }
    })
    .catch((e: unknown) => {
      debugLog('ble', `Scan could not start: ${message(e)}`);
      onError(message(e));
    });
  return () => {
    debugLog('ble', `Scan stopped (${seen.size} device${seen.size === 1 ? '' : 's'} seen)`);
    ble.stopDeviceScan().catch(() => {});
  };
}

/** Connects to a nearby user and downloads every location they are sharing. */
export async function fetchSharedPlaces(
  deviceId: string,
  onProgress?: (done: number, total: number) => void,
  myName?: string,
): Promise<{ from: string; places: SharedPlace[] }> {
  const ble = getManager();
  await ble.stopDeviceScan().catch(() => {});
  debugLog('ble', `Connecting to ${deviceId}`);
  const device = await ble.connectToDevice(deviceId, { requestMTU: 512, timeout: 15000 }).catch((e: unknown) => {
    debugLog('ble', `Could not connect to ${deviceId}: ${message(e)}`);
    throw e;
  });
  debugLog('ble', `Connected to ${deviceId}, MTU ${device.mtu ?? 'unknown'}`);
  try {
    await device.discoverAllServicesAndCharacteristics();
    // Protocol v2: say who is downloading. Older FindCache versions lack the characteristic.
    if (myName?.trim()) {
      const name = encodeName(myName);
      await device
        .writeCharacteristicWithResponseForService(SERVICE_UUID, NAME_UUID, textToBase64(name))
        .then(() => debugLog('ble', `Sent my name "${name}"`))
        .catch((e: unknown) => debugLog('ble', `Name not accepted (older FindCache?): ${message(e)}`));
    }
    const infoChar = await device.readCharacteristicForService(SERVICE_UUID, INFO_UUID);
    const info = decodeInfo(base64ToText(infoChar.value ?? ''));
    debugLog('ble', `Sharer "${info.name}" offers ${info.count} place${info.count === 1 ? '' : 's'} (protocol v${info.v})`);
    const places: SharedPlace[] = [];
    onProgress?.(0, info.count);
    for (let i = 0; i < info.count; i++) {
      await device.writeCharacteristicWithResponseForService(SERVICE_UUID, INDEX_UUID, textToBase64(String(i)));
      const itemChar = await device.readCharacteristicForService(SERVICE_UUID, ITEM_UUID);
      const json = base64ToText(itemChar.value ?? '');
      debugLog('ble', `Read place ${i + 1} of ${info.count} (${utf8ByteLength(json)} bytes)`);
      places.push(decodeItem(json));
      onProgress?.(i + 1, info.count);
    }
    debugLog('ble', `Downloaded ${places.length} place${places.length === 1 ? '' : 's'} from "${info.name}"`);
    return { from: info.name, places };
  } catch (e) {
    debugLog('ble', `Download from ${deviceId} failed: ${message(e)}`);
    throw e;
  } finally {
    await device.cancelConnection().catch(() => {});
    debugLog('ble', `Disconnected from ${deviceId}`);
  }
}
