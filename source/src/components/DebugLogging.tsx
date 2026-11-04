import Constants from 'expo-constants';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef } from 'react';

import { onShareLog } from '../ble/server';
import { useSettings } from '../hooks/useSettings';
import { describeApp } from '../lib/appInfo';
import { checkPreviousRun, logAppState } from '../lib/crashLog';
import { debugLog, debugLogTo, setDebugLogging } from '../lib/debugLog';

/**
 * Turns the debug log on and off with Settings → Troubleshooting. While on, it starts with
 * what is running where ("App started" at launch, "Debug logging on" when switched on) and
 * records the native Bluetooth server's own messages. Switching it off writes a last
 * "Debug logging off" entry.
 */
export function DebugLogging() {
  const db = useSQLiteContext();
  const { settings, loaded } = useSettings();
  const enabled = settings.debugLogging;
  const started = useRef(false); // the first pass after the settings load is the app starting
  const wasEnabled = useRef(false);

  useEffect(() => {
    if (!loaded) return;
    const appStarting = !started.current;
    started.current = true;
    const details = describeApp(Constants.expoConfig?.version ?? 'unknown');
    const switchedOff = wasEnabled.current && !enabled;
    wasEnabled.current = enabled;
    setDebugLogging(db, enabled);
    if (!enabled) {
      if (switchedOff) debugLogTo(db, 'app', `Debug logging off: ${details}`);
      return;
    }
    // Before anything new is written, see whether the last run was cut short.
    void checkPreviousRun(db);
    debugLog('app', `${appStarting ? 'App started' : 'Debug logging on'}: ${details}`);
    const sub = onShareLog((message) => debugLog('share-server', message));
    const stopAppState = logAppState(details);
    return () => {
      stopAppState();
      sub.remove();
      setDebugLogging(null, false);
    };
  }, [db, enabled, loaded]);

  return null;
}
