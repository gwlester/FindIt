# Building and running

Everything below runs inside `source/`, except the GitHub Actions notes at the end.

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
```

```bash
npm run lint
```

```bash
npm test
```

```bash
npm run test:coverage
```

`test:coverage` fails if any file is below 90% statement, branch, function or line coverage.
The tests need Node 22.13 or newer, for the built-in `node:sqlite` used as a real test database.

`npx expo prebuild --platform android` generates the `android/` project. It is
git-ignored; configure native behaviour through `app.json` and config plugins instead
of editing it.

## Adding packages

Use `npx expo install <package>` so versions match the Expo SDK.

## Continuous integration (GitHub Actions)

`.github/workflows/build-android.yml` runs on every push that touches `source/` (and on PRs
from forks), and can be started by hand from the Actions tab once it is on `master`. It:

1. installs dependencies (`npm ci`), then runs the typecheck, lint, and unit tests with the
   90%-per-file coverage check;
2. generates the Android project (`expo prebuild`) and builds a release APK for `arm64-v8a`,
   signed with the debug key so it can be sideloaded;
3. uploads the APK as the artifact `findit-<commit>`, kept for **7 days**.

### Releases

Every successful build of `master` is published as a GitHub Release with a **date-based
version** `YYYY.MM.DD.NNN` (UTC date; `NNN` counts that day's releases from `001`), for example
`2026.10.28.001`. The build stamps that version into the app (`versionName`). The Android
`versionCode` is `YYMMDDNNN` (e.g. `261028001`), so each release installs over the previous one.
Builds of other branches keep the version in `app.json`.

The APK is attached as `findit.apk`, so the README's download link
(`https://github.com/gwlester/findit/releases/latest/download/findit.apk`) always points at the
newest release. Only the **two newest releases** are kept: right after publishing, the release
job deletes older releases and their tags. Release files don't count toward Actions storage.

To make a release, merge to `master` (or run the workflow by hand on `master` from the Actions tab).

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
