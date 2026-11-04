import type { GnssStatus } from '../../modules/findit-native';

/**
 * Where the position most likely comes from. Android does not say which provider produced a
 * fix, so this goes by the satellites in use: with none, the fix can only be from network or
 * Wi-Fi (or an assisted guess); with some, it is a GPS fix.
 */
export function positionSource(status: GnssStatus | null): string {
  if (!status) return 'Position source: waiting for satellite status…';
  if (status.used > 0) return `Position source: GPS satellites (${status.used} in use)`;
  const inView = status.inView > 0 ? `; ${status.inView} in view` : '';
  return `Position source: network or Wi-Fi (no satellites in use yet${inView})`;
}
