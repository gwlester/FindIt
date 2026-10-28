import { NativeModule, requireNativeModule } from 'expo';

export type GnssStatus = {
  /** Satellites the receiver knows about (including ones with no signal). */
  known: number;
  /** Satellites currently being received (signal strength > 0). */
  inView: number;
  /** Satellites used in the current position fix. */
  used: number;
  usedByConstellation: Record<string, number>;
};

export type SharePeerEvent = {
  address: string;
  state: 'connected' | 'disconnected';
};

type FindItNativeEvents = {
  onGnssStatus(status: GnssStatus): void;
  onSharePeer(event: SharePeerEvent): void;
};

declare class FindItNativeModule extends NativeModule<FindItNativeEvents> {
  startGnssStatus(): Promise<void>;
  stopGnssStatus(): Promise<void>;
  /**
   * Start the BLE GATT server and advertise it.
   * `advertisedName` is truncated to fit the scan response; `items` are JSON strings.
   */
  startSharing(advertisedName: string, infoJson: string, items: string[]): Promise<void>;
  stopSharing(): Promise<void>;
  isSharing(): boolean;
}

export default requireNativeModule<FindItNativeModule>('FindItNative');
