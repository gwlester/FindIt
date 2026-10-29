# Done

Completed work, newest first.

## 2026-10-29: More accuracy from GPS

Request: use more of the satellites in view to improve accuracy. Apps can't choose which
satellites the chipset uses, so instead:

- **Position averaging** on Add/Edit place: an "Average position" button collects fixes, shows a
  live count, duration, estimated accuracy, spread and satellites, and "Use average" fills in the
  coordinates and recorded accuracy. The accuracy estimate was calibrated with a Monte Carlo
  simulation of drifting GPS errors (see `docs/architecture.md`).
- **Full GNSS tracking** (Android 12+) while the compass or averaging panel is open, via
  `GnssMeasurementRequest.setFullTracking(true)`; new **High-accuracy GPS** setting (default on).
- **Smoothing** of the compass heading (circular) and position (exponential, with reset on gaps/jumps).
- Wireframes (new 02b averaging screen, settings, compass) and docs updated.

## 2026-10-29: Merged and first release; manifest warning

- Merged [gwlester/FindIt#1](https://github.com/gwlester/FindIt/pull/1) into `master`; the first
  release `2026.10.28.001` was published with `findit.apk`, and the README download link works.
- Fixed the `expoReleaseOverrideMaxSdkConflicts` build warning: `findit-native` no longer
  declares `BLUETOOTH` / `BLUETOOTH_ADMIN` (with `maxSdkVersion=30`), which conflicted with the
  same permissions from react-native-ble-plx / the app manifest.

## 2026-10-28: Releases and download link

Requests: a link on the main README to the latest release; date-based versions like `2026.10.28.001`.

Delivered:
- Every successful `master` build is published as a GitHub Release tagged `YYYY.MM.DD.NNN`
  (UTC, `NNN` = that day's sequence). The version is stamped into the app; versionCode is `YYMMDDNNN`.
- APK attached as `findit.apk`; README "Download" section links to
  `releases/latest/download/findit.apk` and the latest release page.
- Only the two newest releases are kept; the release job deletes older ones (and their tags) after publishing.
- Documented in `docs/building.md`.

## 2026-10-28: Scrolling lists

Request: the places list and the list of FindIt users nearby must scroll when they don't fit.

Delivered:
- Places screen: the list scrolls between the header and the fixed bottom buttons (scrollbar always shown).
- Share nearby: the screen no longer scrolls as one page. "Receive from nearby" (or the import panel)
  and "Share my places" each take part of the screen; their lists scroll inside the section so the
  buttons stay visible.
- Wireframes updated to show the scrolling regions.

## 2026-10-28: GitHub Actions

Requests: commit and push; GitHub Actions to build; keep Actions storage clean.

Delivered:
- `.github/workflows/build-android.yml`: typecheck, lint, `expo prebuild`, release APK
  (arm64-v8a, debug-signed) uploaded as an artifact kept for 7 days; Gradle cache writes only from
  the default branch, with automatic cleanup; newer pushes cancel builds still running.
- `.github/workflows/cleanup.yml`: deletes caches when a PR closes or a branch is deleted. Weekly,
  it also deletes artifacts older than 7 days, caches for branches that are gone, and runs older than
  30 days.
- Documented in `docs/building.md`.

## 2026-10-28: Initial app

Requests:
- React Native app, **Android only**.
- List of geo locations with names; pick one from the list of known locations.
- Compass circle with an arrow pointing at the chosen location; the outer circle rotates so
  N/S/E/W always point at the real directions.
- Below the compass: approximate distance and an "uncertainty radius".
- A line with the number of GPS satellites visible and used.
- Share locations with other FindIt users nearby (Bluetooth).
- All storage in a local SQLite database.
- Use the latest package versions where possible.
- Sources in a `source` folder, a `docs` folder with wireframes of every screen, and
  `prompts/ToDo.md` + `prompts/Done.md`.

Delivered:
- Expo SDK 58 / React Native 0.88 / TypeScript app in `source/`, Expo Router navigation.
- Screens: Places list, Add/Edit place, Compass, Share nearby (send + receive/import), Settings.
- `expo-sqlite` storage with versioned migrations (`locations`, `settings` tables).
- Compass: SVG rose rotated by heading (true north when available) and an arrow to the target;
  distance (haversine), uncertainty radius = √(GPS accuracy² + recorded accuracy²), bearing, heading,
  calibration hint, "look around" message when inside the radius.
- Satellites: local Kotlin Expo module (`findit-native`) using Android `GnssStatus`: used / in view /
  known, plus used-per-constellation.
- Bluetooth sharing: Kotlin GATT server + advertiser in `findit-native`; scanning/downloading with
  `react-native-ble-plx`. Pick which places to share; pick which received places to import;
  duplicates skipped. See `docs/ble-protocol.md`.
- Coordinate entry accepts decimal degrees, degrees + decimal minutes (geocaching style) and DMS.
- Metric / imperial units; display name for sharing.
- Docs: architecture, BLE protocol, build instructions, SVG wireframes (+ generator script).
- Package versions: latest Expo SDK (58) and the newest versions it supports. Exceptions:
  TypeScript is kept at 6.0.3, because typescript-eslint doesn't support TypeScript 7 yet, and
  ESLint at 9.x, because eslint-plugin-react doesn't support ESLint 10 yet.
- Checks run: `tsc` and `eslint` pass, `expo prebuild` succeeds, the Android JS bundle exports,
  and the geo, coordinate-parsing, base64 and protocol logic were spot-checked with a script.
  Not run on a device yet. The first GitHub Actions build (run 40787921139) compiled everything,
  including the Kotlin module, and produced a 32 MB release APK.
