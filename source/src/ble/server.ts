import FindItNative, { type SharePeerEvent } from '../../modules/findit-native';
import { encodeInfo, encodeItem, type SharedPlace } from './protocol';

export function startSharing(displayName: string, places: SharedPlace[]): Promise<void> {
  return FindItNative.startSharing(displayName, encodeInfo(displayName, places.length), places.map(encodeItem));
}

export function stopSharing(): Promise<void> {
  return FindItNative.stopSharing();
}

export function isSharing(): boolean {
  return FindItNative.isSharing();
}

export function onSharePeer(listener: (event: SharePeerEvent) => void) {
  return FindItNative.addListener('onSharePeer', listener);
}
