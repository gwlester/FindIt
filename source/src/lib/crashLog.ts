// Crash clues for the debug log (when logging is on): fatal JavaScript errors, and a note at the
// next start if the previous run did not end by going to the background (a crash, usually).

import type { SQLiteDatabase } from 'expo-sqlite';
import { AppState } from 'react-native';

import { debugLog, flushDebugLog, readDebugLog } from './debugLog';

const BACKGROUND = 'Moved to the background';
/** Newest entries that show the last run ended normally (or the log was deliberately cleared or switched off). */
const ENDINGS = [BACKGROUND, 'Debug logging off', 'Debug log cleared'];
const FLUSH_WAIT_MS = 1000;
let checked = false;
let installed = false;

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

/** Logs promise rejections that nothing handled (Hermes drops these silently in release builds). */
export function logRejections(): void {
  const hermes = (globalThis as { HermesInternal?: { enablePromiseRejectionTracker?: (options: object) => void } }).HermesInternal;
  hermes?.enablePromiseRejectionTracker?.({
    allRejections: true,
    onUnhandled: (_id: number, error: unknown) => {
      const stack = error instanceof Error ? (error.stack ?? '').split('\n').slice(0, 8).join('\n') : '';
      debugLog('crash', `Unhandled promise rejection: ${error instanceof Error ? error.message : String(error)}\n${stack}`);
    },
  });
}

/** Installs the catch-all handlers once, as early as possible (called when the root layout loads). */
export function installCrashLogging(): void {
  if (installed) return;
  installed = true;
  logCrashes();
  logRejections();
}

/** Logs when the app goes to the background, which is how a normal run ends. Returns the undo. */
export function logAppState(details: string): () => void {
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'background') debugLog('app', `${BACKGROUND}: ${details}`);
  });
  return () => subscription.remove();
}

/** Once per start: if the newest entry is not the background note, the last run ended abruptly. */
export async function checkPreviousRun(db: SQLiteDatabase): Promise<void> {
  if (checked) return;
  checked = true;
  const [newest] = await readDebugLog(db);
  if (newest && !ENDINGS.some((note) => newest.message.startsWith(note))) {
    debugLog('app', 'The previous run did not end in the background: the app probably crashed, or was closed while in use');
  }
}
