# Done

Completed work, newest first.

## 2026-10-29: App icon and splash (B · Pin)

- Three concepts in Girl Scout green and blues (`docs/branding/`); the owner chose **B · Pin**:
  a green map pin with a compass star on a blue gradient.
- Adaptive launcher icon (foreground, background, themed monochrome with the star cut out) and
  an `expo-splash-screen` navy splash, light and dark. `export_png.js` regenerates the assets;
  a config test checks `app.json`.

## 2026-10-29: Sharing history with names (Bluetooth protocol v2)

Built test-first (protocol, client, database, screens; Kotlin compiled by CI):
- Protocol v2: a new NAME characteristic. The receiver writes its "name for sharing" (trimmed,
  ≤ 40 UTF-8 bytes) before reading; errors are ignored so v1 servers still work.
- `ShareServer.kt` remembers each receiver's name and the distinct places it read, and reports
  both in the disconnect event.
- `share_history` table (schema v3). The Share screen records who downloaded how many places
  (older versions: "FindIt user"; connect-only visits aren't recorded) and links to
  **Sharing history (N)**: a new screen, newest first, with **Clear history** (confirmed).
- Settings → Sharing history: 7 / 30 / 90 (default) days, 1 year, or Forever; old entries are
  pruned when the Share or history screen opens.
- Wireframes 04 (link), 06b (setting), new 08; `ble-protocol.md` and architecture updated.

## 2026-10-29: Mark places as found

Built test-first (data layer, formats, then screens):
- `finds` table (schema v2) with who found it ('' = me); deleting a place deletes its finds.
- Compass: **Mark found** with an optional comment ("Update find" in once mode); shows
  "✓ Found <date>" / "Found N times, last <date>" / "Found by <name> <date>" and the comment.
- Places list: ✓ line per found place; **Hide found places** (remembered) hides places I found.
- Settings → Found places: Off / Once per place (default) / Keep a log; switching to "once"
  keeps the log and shows the latest.
- Export and Bluetooth sharing ask **Include found information?** GPX: `Geocache Found` symbol +
  FindIt find extensions (round-trips; other apps' "Geocache Found" imports as one find);
  GeoJSON: `finds` list; Bluetooth: `f` array, oldest dropped first to fit, sender's own finds
  stored as "found by <sender>".
- Wireframes 01, 03, 03e (dialog), 06b (settings, scrolled).

## 2026-10-29: Compass search area, with a switch-distance setting

Built test-first (`lib/searchArea.ts`, settings, Compass component, compass screen):
- Within the switch distance the compass's inner circle becomes a heading-up map: the cache at
  its scaled distance and bearing, a shaded search circle (uncertainty radius), your accuracy as a
  halo, and scale labels; banner "You're in the search area — look around!".
- Settings → Search area: "Always show the arrow", or a −/+ distance (default 50 m). Stored in
  metres; shown in the current units rounded to 5 m / 10 ft and converted when units change
  (50 m ↔ 160 ft, no drift).
- Wireframes 03c/03d (no longer a proposal) and 06 settings.

## 2026-10-29: Keep the screen awake; hardware verification; next wave planned

- Verified on hardware by the owner (all worked, including indoors): installing the release APK,
  the compass (rose orientation, arrow, true vs magnetic heading), satellite counts against a GNSS
  test app with High-accuracy GPS on and off, and position averaging at a known point (open sky
  and under trees).
- Keep the screen awake (test-first, `expo-keep-awake`): always on the compass, while the
  averaging panel is open, and on the Share screen while sharing, looking or downloading. A small
  `<KeepAwake tag>` component scopes it; tests check it's released again.
- Next wave agreed (see ToDo): search area + switch-distance setting, mark found, sharing history
  with names, icon/splash; maps afterwards.

## 2026-10-29: Average my position on the compass

Request: "use average" on the compass page, chosen as a steadier distance (nothing saved).
Built test-first (red → green → refactor at each step):
- `hasMovedAway()` in `lib/averaging.ts`: a fix more than 3× its accuracy (at least 10 m) from the
  average.
- `useAveragePosition({ stopWhenMoving })`: stops, leaves the far fix out, and sets `movedAway`.
  It only judges movement after 3 fixes.
- Compass: **Average my position** / **Stop averaging**. While averaging, the distance, bearing and
  uncertainty radius use the average ("· averaged over N fixes"); walking away stops it with a note.
- 207 tests; the changed files are at 100% coverage. Wireframes 03 and 03b updated.

## 2026-10-29: Delete stale branches

Request: delete branches once they're stale (merged). The repo setting can't be changed from the
session, so `cleanup.yml` does it:
- On merge of a same-repo PR: delete its branch and the branch's caches.
- Weekly sweep: delete any branch whose latest commit belongs to a merged PR and that has no
  open PR (never the default branch). Dry-run against the repo found exactly the merged
  `claude/findit-android-app` branch.
- Also done: "Protect master" ruleset active with required `build` check (owner), and PR #5 was
  the first merge under it.

## 2026-10-29: Workflow triggers for branch protection

Problem (shown on real commits before fixing): same-repo PRs got a *skipped* `build` check from
the `pull_request` event, and GitHub counts skipped as passing, so a required check could pass
before the real build finished. A docs-only commit got only that skipped check, with no build.

- `build-android.yml` now runs on every pull request (no path filter) and on pushes to `master`.
  It no longer runs on pushes to other branches.
- Releases only happen when a `master` push changes `source/` or the build workflow (or on a
  manual run). Checked against a simulated git history: docs-only merge → no release; app or
  workflow change → release; manual run → release.
- The PR coverage comment uses the pull request event; it's skipped for fork PRs.
- Recommended `master` ruleset documented in `docs/building.md`. Codecov (OIDC) and GitHub
  Pages are set up by the owner.

## 2026-10-29: Coverage on GitHub (run summary, PR comment, Codecov, badges, Pages); flaky CI fix

- Codecov upload (OIDC, no stored token, non-blocking) for history and PR checks; README
  badges for build status, Codecov coverage and the HTML report; `master` builds publish the
  HTML coverage report to GitHub Pages (https://gwlester.github.io/FindIt/).
- `scripts/coverage-report.js` (written test-first) turns Jest's coverage summary into a
  Markdown table. CI adds it to each run's summary page and upserts it as a PR comment.
- Fixed intermittent CI test failures: screen tests could exceed Jest's 5 s timeout on a busy
  runner with coverage on. Reproduced locally (3 of 9 stressed runs failed), then the timeout
  was raised to 30 s (9 of 9 pass). CI now also reports failing tests as annotations.

## 2026-10-29: Test-driven development

Request: use TDD from now on. Recorded in the root `CLAUDE.md` (red → green → refactor, bug
fixes start with a reproducing test, 90% per-file coverage).

## 2026-10-29: GPX / GeoJSON import and export; unit tests

Requests: GPX and GeoJSON import/export (ask the format on export, detect it on import); unit
tests with at least 90% function/branch/line coverage on each file (all TypeScript files).

Delivered:
- `src/formats/`: GPX 1.1 export (FindIt accuracy extension) and GPX 1.0/1.1 import, including
  geocaching.com caches (name + code, hint). GeoJSON export/import. Format detection by
  extension, MIME type or content.
- New **Import / Export** screen (header link "Files"). Export asks GPX or GeoJSON, then opens
  the share sheet. Import uses the file picker, previews and selects places, and skips duplicates.
  Shared `importPlaces()` is also used by Bluetooth import.
- Jest + React Native Testing Library 14 test suite: 190 tests in 31 files covering every
  TypeScript file. SQL runs on a real in-memory SQLite. GPS, compass, BLE, the native module and
  navigation are mocked.
  - Every file is at ≥90% statements/branches/functions/lines; most are at 100%. This is enforced
    per file in `jest.config.js` and in CI.
- Separate `__tests__/tsconfig.json` (TypeScript 6 no longer loads global types by default).
- Docs (formats, tests), wireframes (07 Import / Export, 07b importing) updated.

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
