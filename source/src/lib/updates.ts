// "Check for updates" for the sideloaded (not Google Play) app: look up the newest GitHub
// release, download its findcache.apk and hand it to Android's installer.

import Constants from 'expo-constants';
import { Directory, File, Paths } from 'expo-file-system';
import { getContentUriAsync } from 'expo-file-system/legacy';
import { startActivityAsync } from 'expo-intent-launcher';

import FindItNative from '../../modules/findit-native';
import { debugLog } from './debugLog';
import { HttpError } from './failure';

export const LATEST_RELEASE_URL = 'https://api.github.com/repos/gwlester/findit/releases/latest';
export const APK_NAME = 'findcache.apk';
const GRANT_READ_URI_PERMISSION = 1;

export type Update = { version: string; apkUrl: string; notes: string };

/** The running app's version: a release date version like 2026.11.04.001, or 1.0.0 in a dev build. */
export function currentVersion(): string {
  return Constants.expoConfig?.version ?? '0';
}

/** Whether this build can install updates (only the sideloaded APK declares the permission). */
export function canSelfUpdate(): boolean {
  return FindItNative.canSelfUpdate();
}

const parts = (version: string) => version.split('.').map((p) => Number.parseInt(p, 10) || 0);

/** True when `candidate` is a later dotted-number version than `current`. */
export function isNewer(candidate: string, current: string): boolean {
  const a = parts(candidate);
  const b = parts(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}

type Release = { tag_name?: string; body?: string | null; assets?: { name: string; browser_download_url: string }[] };

/** The newest release if it is newer than this app and has an APK; otherwise null. Throws if GitHub can't be reached. */
export async function checkForUpdate(): Promise<Update | null> {
  const response = await fetch(LATEST_RELEASE_URL, { headers: { Accept: 'application/vnd.github+json' } });
  if (!response.ok) throw new HttpError(response.status, `GitHub answered ${response.status}`);
  const release = (await response.json()) as Release;
  debugLog('update', `Latest release ${release.tag_name ?? '(none)'}; this app is ${currentVersion()}`);
  const version = release.tag_name?.replace(/^v/, '');
  const apk = release.assets?.find((a) => a.name === APK_NAME);
  if (!version || !apk || !isNewer(version, currentVersion())) return null;
  return { version, apkUrl: apk.browser_download_url, notes: release.body?.trim() ?? '' };
}

/** Deletes every APK in the cache, e.g. from an install that was started but never finished. */
function removeLeftoverDownloads() {
  let removed = 0;
  for (const entry of new Directory(Paths.cache).list()) {
    if (!entry.uri.toLowerCase().endsWith('.apk')) continue;
    try {
      entry.delete();
      removed++;
    } catch (e) {
      debugLog('update', `Could not remove a leftover download: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (removed > 0) debugLog('update', `Removed ${removed} leftover download${removed === 1 ? '' : 's'}`);
}

/** Downloads the update and opens Android's installer for it. */
export async function downloadAndInstall(update: Update): Promise<void> {
  removeLeftoverDownloads();
  debugLog('update', `Downloading ${update.apkUrl}`);
  // The download refuses to overwrite, so a leftover that could not be deleted gets a fresh name.
  let destination = new File(Paths.cache, `findcache-${update.version}.apk`);
  if (destination.exists) destination = new File(Paths.cache, `findcache-${update.version}-${Date.now()}.apk`);
  const file = await File.downloadFileAsync(update.apkUrl, destination);
  debugLog('update', 'Downloaded; opening the installer');
  const uri = await getContentUriAsync(file.uri);
  await startActivityAsync('android.intent.action.INSTALL_PACKAGE', {
    data: uri,
    flags: GRANT_READ_URI_PERMISSION,
    type: 'application/vnd.android.package-archive',
  });
}
