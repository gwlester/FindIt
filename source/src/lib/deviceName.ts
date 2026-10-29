import { deviceName } from 'expo-device';

export const FALLBACK_NAME = 'FindCache user';

/** What nearby users see until a name is chosen: the phone's own name (Settings → About phone). */
export function defaultDisplayName(): string {
  return deviceName?.trim() || FALLBACK_NAME;
}
