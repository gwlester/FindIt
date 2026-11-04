// What is running where, in the form the debug log uses for its "logging on" and "uploading" entries.

import * as Device from 'expo-device';
import { Platform } from 'react-native';

/** "FindCache 2026.11.04.006, Android 17 (API 37), Google Pixel 10 Pro". */
export function describeApp(version: string): string {
  const model = [Device.manufacturer, Device.modelName].filter(Boolean).join(' ');
  return [`FindCache ${version}`, `Android ${Device.osVersion ?? '?'} (API ${Platform.Version})`, model].filter(Boolean).join(', ');
}
