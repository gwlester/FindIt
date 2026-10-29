import { BleManager, type Device, type Subscription } from 'react-native-ble-plx';

import { base64ToText, textToBase64 } from '../lib/base64';
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
  return getManager().onStateChange(listener, true);
}

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
  ble
    .startDeviceScan([SERVICE_UUID], { allowDuplicates: true }, async (error, device) => {
      if (error) {
        onError(error.message);
        return;
      }
      if (device) {
        onUser({ id: device.id, name: advertisedName(device), rssi: device.rssi, lastSeen: Date.now() });
      }
    })
    .catch((e: unknown) => onError(e instanceof Error ? e.message : String(e)));
  return () => {
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
  const device = await ble.connectToDevice(deviceId, { requestMTU: 512, timeout: 15000 });
  try {
    await device.discoverAllServicesAndCharacteristics();
    // Protocol v2: say who is downloading. Older FindCache versions lack the characteristic.
    if (myName?.trim()) {
      await device
        .writeCharacteristicWithResponseForService(SERVICE_UUID, NAME_UUID, textToBase64(encodeName(myName)))
        .catch(() => {});
    }
    const infoChar = await device.readCharacteristicForService(SERVICE_UUID, INFO_UUID);
    const info = decodeInfo(base64ToText(infoChar.value ?? ''));
    const places: SharedPlace[] = [];
    onProgress?.(0, info.count);
    for (let i = 0; i < info.count; i++) {
      await device.writeCharacteristicWithResponseForService(SERVICE_UUID, INDEX_UUID, textToBase64(String(i)));
      const itemChar = await device.readCharacteristicForService(SERVICE_UUID, ITEM_UUID);
      places.push(decodeItem(base64ToText(itemChar.value ?? '')));
      onProgress?.(i + 1, info.count);
    }
    return { from: info.name, places };
  } finally {
    await device.cancelConnection().catch(() => {});
  }
}
