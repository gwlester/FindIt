# Done

Completed work, newest first.

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
  **Not yet compiled or run on a device** (no Android SDK in the build environment).
