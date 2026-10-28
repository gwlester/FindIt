# Building and running

Everything below runs inside `source/`.

## Prerequisites

- Node.js 20+ (developed with Node 22)
- Android Studio with an Android SDK, or an EAS account for cloud builds
- An Android phone with Bluetooth LE and GPS. Emulators have no Bluetooth or real GNSS, so
  sharing and satellite counts need real hardware (two phones to test sharing).

## Install

```bash
cd source
npm install
```

## Run on a device (development build)

The app includes native code (`modules/findit-native`, `react-native-ble-plx`), so it
cannot run in Expo Go. Build and install a development build:

```bash
npx expo run:android
```

Or build in the cloud with EAS (profiles are in `eas.json`):

```bash
npx eas-cli@latest build --profile development --platform android
```

After that, `npm start` serves JavaScript changes to the installed app.

## Checks

```bash
npm run typecheck
npm run lint
```

`npx expo prebuild --platform android` generates the `android/` project. It is
git-ignored; configure native behaviour through `app.json` and config plugins instead
of editing it.

## Adding packages

Use `npx expo install <package>` so versions match the Expo SDK.

## Continuous integration (GitHub Actions)

`.github/workflows/build-android.yml` runs on every push that touches `source/` (and on PRs
from forks), and can be started by hand from the Actions tab once it is on `master`. It:

1. installs dependencies (`npm ci`), then runs the typecheck and lint;
2. generates the Android project (`expo prebuild`) and builds a release APK for `arm64-v8a`,
   signed with the debug key so it can be sideloaded;
3. uploads the APK as the artifact `findit-<commit>`, kept for **7 days**.

### Making a release

Push a version tag, for example:

```bash
git tag v1.0.0
git push origin v1.0.0
```

(or draft a release with a new `v1.0.0` tag in GitHub's Releases page). The workflow then
builds with that version (`versionName` 1.0.0, `versionCode` = the workflow run number, so each
release installs over the last). The `release` job publishes a GitHub Release with the APK
attached as `findit.apk`. The README's download link
(`https://github.com/gwlester/findit/releases/latest/download/findit.apk`) always points at the
newest release. Release files don't count toward Actions storage.

### Builds between releases

Every other build is only in the Actions tab: open the run, download the artifact
(you need to be signed in to GitHub), unzip it, and open the `.apk` on the phone.

### Keeping Actions storage clean

- Artifacts expire after 7 days. They're stored uncompressed, since APKs are already compressed.
- The Gradle cache is written only from the default branch, and stale entries are removed
  after every run (`cache-cleanup: always`). Newer pushes cancel builds still in progress.
- `.github/workflows/cleanup.yml` deletes a PR's caches when it closes and a branch's caches
  when it is deleted. Once a week it also deletes artifacts older than 7 days, caches for
  branches that are gone, and workflow runs (and their logs) older than 30 days.
  Scheduled and branch-delete events only run workflows from the default branch, so this
  starts working once it is merged to `master`. It can also be run by hand from the Actions tab.
