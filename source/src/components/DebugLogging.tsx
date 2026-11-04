import Constants from 'expo-constants';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';

import { onShareLog } from '../ble/server';
import { useSettings } from '../hooks/useSettings';
import { describeApp } from '../lib/appInfo';
import { checkPreviousRun, logAppState } from '../lib/crashLog';
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
    debugLog('app', `Debug logging on: ${describeApp(Constants.expoConfig?.version ?? 'unknown')}`);
    const sub = onShareLog((message) => debugLog('share-server', message));
    const stopAppState = logAppState();
    return () => {
      stopAppState();
      sub.remove();
      setDebugLogging(null, false);
    };
  }, [db, enabled]);

  return null;
}
