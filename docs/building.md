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

## Licences shown in the app

After adding or upgrading a package, regenerate the licence list for About → Open-source
licences (a test fails when a main library's version no longer matches):

```bash
npx expo export --platform android --source-maps --output-dir /tmp/findit-bundle
npm run licenses -- /tmp/findit-bundle/_expo/static/js/android/*.map
```

Only packages in the app bundle are listed; edit `scripts/native-licenses.json` for native
libraries.

## Continuous integration (GitHub Actions)

`.github/workflows/build-android.yml` runs on **every pull request** (including docs-only
ones), on **every push to `master`**, and by hand from the Actions tab. Its job is called
`build`, which is the status check required by the `master` ruleset. It:

1. installs dependencies (`npm ci`), then runs the typecheck, lint, and unit tests with the
   90%-per-file coverage check;
2. generates the Android project (`expo prebuild`) and builds a release APK for `arm64-v8a`,
   signed with the debug key so it can be sideloaded;
3. uploads the APK as the artifact `findcache-<commit>`, kept for **7 days**;
4. on release builds, if the upload-keystore secrets exist, also builds a Play-ready AAB
   (`bundleRelease`) signed with the upload key and uploads it as `findcache-aab-<commit>`.

**Upload keystore (for Google Play).** Create a keystore once (or reuse the Virtual Church Musician one, which uses the same secret names) (`keytool -genkeypair -v -keystore
upload.keystore -alias upload -keyalg RSA -keysize 2048 -validity 10000`), keep it out of the
repo, and add four repository secrets: `ANDROID_RELEASE_KEYSTORE_BASE64` (`base64 -w0
upload.keystore`), `ANDROID_RELEASE_KEYSTORE_PASSWORD`, `ANDROID_RELEASE_KEY_ALIAS` and
`ANDROID_RELEASE_KEY_PASSWORD`. Without them the AAB step is skipped. Signing is applied by
`.github/gradle/release-signing.init.gradle`. The sideload APK stays debug-signed so existing
installs can update over it; enrol the app in Play App Signing on the first upload.

### Test coverage reports

- **Run summary:** every build adds a coverage table (totals plus every file, ✅/❌ against
  the 90% minimum) to its summary page in the Actions tab.
- **Pull requests:** builds of a branch with an open pull request post the same table as a PR
  comment. Later pushes update that one comment.
- **Codecov:** every build uploads `coverage/lcov.info` to
  [codecov.io](https://codecov.io/gh/gwlester/FindIt) for coverage history, per-PR changes and the
  README badge. The upload uses GitHub's OIDC identity, so no token is stored, and never fails
  the build.
- **HTML report:** `master` builds publish the browsable line-by-line report
  (`coverage/lcov-report`) to GitHub Pages at <https://gwlester.github.io/FindIt/>. The Pages
  artifact is kept for one day.
- The table is produced by `source/scripts/coverage-report.js` from Jest's
  `coverage/coverage-summary.json`, and is tested like the rest of the code.

One-time setup (repository owner):
1. Codecov: sign in at <https://codecov.io> with GitHub and enable `gwlester/FindIt`.
2. GitHub Pages: repository **Settings → Pages → Build and deployment → Source: GitHub Actions**.

### Branch protection (`master` ruleset)

Settings → Rules → Rulesets → **Protect master**: target the default branch; Active; bypass:
Repository admin, *for pull requests only*.

| Rule | Setting |
| --- | --- |
| Restrict deletions | On |
| Require a pull request before merging | On: 0 required approvals (you can't approve your own PRs), require conversation resolution, Merge allowed |
| Require an additional approval for unattributed Copilot pull requests | On |
| Require status checks to pass | On: branches must be up to date; required check **`build`** (source: GitHub Actions), optionally **`codecov/project`** (source: Codecov) |
| Block force pushes | On |
| Linear history, signed commits, deployments, code scanning | Off |

### Releases

Every successful build of `master` **that changes the app** (`source/` or the build workflow) is
published as a GitHub Release; docs-only merges are built and tested but not released. Running
the workflow by hand on `master` always releases. Releases use a **date-based
version** `YYYY.MM.DD.NNN` (UTC date; `NNN` counts that day's releases from `001`), for example
`2026.10.28.001`. The build stamps that version into the app (`versionName`). The Android
`versionCode` is `YYMMDDNNN` (e.g. `261028001`), so each release installs over the previous one.
Builds of other branches keep the version in `app.json`.

The APK is attached as `findcache.apk`, so the README's download link
(`https://github.com/gwlester/findit/releases/latest/download/findcache.apk`) always points at the
newest release. Only the **two newest releases** are kept: right after publishing, the release
job deletes older releases and their tags. Release files don't count toward Actions storage.

To make a release, merge to `master` (or run the workflow by hand on `master` from the Actions tab).

### Builds between releases

Every other build is only in the Actions tab: open the run, download the artifact
(you need to be signed in to GitHub), unzip it, and open the `.apk` on the phone.

### Keeping branches and Actions storage clean

- Artifacts expire after 7 days. They're stored uncompressed, since APKs are already compressed.
- The Gradle cache is written only from the default branch, and stale entries are removed
  after every run (`cache-cleanup: always`). Newer pushes cancel builds still in progress.
- `.github/workflows/cleanup.yml`:
  - when a PR from this repo is **merged**, deletes its **branch** and the branch's caches;
  - when a PR closes, deletes the PR's caches; when a branch is deleted, deletes its caches;
  - weekly: deletes **stale branches** that were missed (latest commit belongs to a merged PR,
    no open PR; never `master`), artifacts older than 7 days, caches for branches that are
    gone, and workflow runs (and their logs) older than 30 days.

  Scheduled and branch-delete events only run workflows from the default branch. The weekly
  sweep can also be run by hand from the Actions tab.
- Optionally, also tick Settings → General → Pull Requests → **Automatically delete head
  branches**. It does the same as the merged-branch job; whichever runs second finds the
  branch already gone.
