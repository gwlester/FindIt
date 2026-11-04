// Crash clues for the debug log (when logging is on): fatal JavaScript errors, and a note at the
// next start if the previous run did not end by going to the background (a crash, usually).

import type { SQLiteDatabase } from 'expo-sqlite';
import { AppState } from 'react-native';

import { debugLog, flushDebugLog, readDebugLog } from './debugLog';

const BACKGROUND = 'Moved to the background';
const FLUSH_WAIT_MS = 1000;
let checked = false;

/** For tests: forget that this run's check was done. */
export function resetPreviousRunCheck() {
  checked = false;
}

/** Logs uncaught JavaScript errors, then lets the normal handler run. Returns the undo. */
export function logCrashes(): () => void {
  const utils = typeof ErrorUtils === 'undefined' ? undefined : ErrorUtils;
  if (!utils) return () => {};
  const previous = utils.getGlobalHandler();
  utils.setGlobalHandler((error, isFatal) => {
    const stack = (error.stack ?? '').split('\n').slice(0, 8).join('\n');
    debugLog('crash', `${isFatal ? 'Fatal' : 'Uncaught'} error: ${error.message}\n${stack}`);
    // Give the log a moment to reach the database before a fatal error ends the app.
    const handOn = () => previous(error, isFatal);
    Promise.race([flushDebugLog(), new Promise((resolve) => setTimeout(resolve, FLUSH_WAIT_MS))]).then(handOn, handOn);
  });
  return () => utils.setGlobalHandler(previous);
}

/** Logs when the app goes to the background, which is how a normal run ends. Returns the undo. */
export function logAppState(): () => void {
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'background') debugLog('app', BACKGROUND);
  });
  return () => subscription.remove();
}

/** Once per start: if the newest entry is not the background note, the last run ended abruptly. */
export async function checkPreviousRun(db: SQLiteDatabase): Promise<void> {
  if (checked) return;
  checked = true;
  const [newest] = await readDebugLog(db);
  if (newest && newest.message !== BACKGROUND) {
    debugLog('app', 'The previous run did not end in the background: the app probably crashed, or was closed while in use');
  }
}
