import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { onShareLog } from '../ble/server';
import { useSettings } from '../hooks/useSettings';
import { checkPreviousRun, logAppState, logCrashes } from '../lib/crashLog';
import { debugLog, setDebugLogging } from '../lib/debugLog';

/**
 * Turns the debug log on and off with Settings → Troubleshooting. While on, it starts with
 * what is running where and records the native Bluetooth server's own messages.
 */
export function DebugLogging() {
  const db = useSQLiteContext();
  const { settings } = useSettings();
  const enabled = settings.debugLogging;

  useEffect(() => {
    setDebugLogging(db, enabled);
    if (!enabled) return;
    // Before anything new is written, see whether the last run was cut short.
    void checkPreviousRun(db);
    const model = [Device.manufacturer, Device.modelName].filter(Boolean).join(' ');
    const about = [
      `FindCache ${Constants.expoConfig?.version ?? 'unknown'}`,
      `Android ${Device.osVersion ?? '?'} (API ${Platform.Version})`,
      model,
    ];
    debugLog('app', `Debug logging on: ${about.filter(Boolean).join(', ')}`);
    const sub = onShareLog((message) => debugLog('share-server', message));
    const stopCrashLog = logCrashes();
    const stopAppState = logAppState();
    return () => {
      stopCrashLog();
      stopAppState();
      sub.remove();
      setDebugLogging(null, false);
    };
  }, [db, enabled]);

  return null;
}
