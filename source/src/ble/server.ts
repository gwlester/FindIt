import FindItNative, { type SharePeerEvent } from '../../modules/findit-native';
import { utf8ByteLength } from '../lib/base64';
import { debugLog } from '../lib/debugLog';
import { encodeInfo, encodeItem, type SharedPlace } from './protocol';

/** Bytes of the name that fit in the scan response (see ShareServer.kt). */
const ADVERTISED_NAME_BYTES = 13;

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export async function startSharing(displayName: string, places: SharedPlace[]): Promise<void> {
  const items = places.map(encodeItem);
  const largest = Math.max(0, ...items.map(utf8ByteLength));
  debugLog(
    'share',
    `Starting as "${displayName}" (${utf8ByteLength(displayName)} bytes; ${ADVERTISED_NAME_BYTES} fit in the advertisement), ` +
      `${places.length} place${places.length === 1 ? '' : 's'}, largest ${largest} bytes`,
  );
  try {
    await FindItNative.startSharing(displayName, encodeInfo(displayName, places.length), items);
    debugLog('share', 'Sharing started');
  } catch (e) {
    debugLog('share', `Sharing could not start: ${message(e)}`);
    throw e;
  }
}

export async function stopSharing(): Promise<void> {
  debugLog('share', 'Sharing stopped');
  await FindItNative.stopSharing();
}

export function isSharing(): boolean {
  return FindItNative.isSharing();
}

export function onSharePeer(listener: (event: SharePeerEvent) => void) {
  return FindItNative.addListener('onSharePeer', listener);
}

/** What the native GATT server reports (advertising, connections, reads, writes) for the debug log. */
export function onShareLog(listener: (message: string) => void) {
  return FindItNative.addListener('onShareLog', (e) => listener(e.message));
}
