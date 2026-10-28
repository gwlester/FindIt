# Architecture

## Repository layout

```
FindIt/
├── docs/                  Documentation and wireframes
├── prompts/               ToDo.md (open work) and Done.md (completed work)
└── source/                The Expo / React Native app (run all npm commands here)
    ├── app.json           Expo config (Android only), permissions, config plugins
    ├── assets/            Icons and splash images
    ├── modules/
    │   └── findit-native/ Local Expo module (Kotlin): GNSS satellite status + BLE GATT server
    └── src/
        ├── app/           Screens (Expo Router: one file per route)
        ├── ble/           Bluetooth sharing: protocol, scanner/downloader, server wrapper
        ├── components/    Compass graphic and small UI building blocks
        ├── db/            SQLite schema, migrations and queries
        ├── hooks/         Position, heading, satellites, settings
        └── lib/           Geo maths, formatting, base64/UTF-8, theme
```

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Expo SDK 58, React Native 0.88, React 19.3, TypeScript 6 |
| Navigation | Expo Router (`source/src/app`) |
| Storage | `expo-sqlite` (local file `findit.db`); nothing leaves the phone except over Bluetooth sharing |
| GPS / heading | `expo-location` (`watchPositionAsync` at `BestForNavigation`, `watchHeadingAsync`) |
| Satellites | `findit-native` module: Android `GnssStatus` callback |
| Compass drawing | `react-native-svg` |
| BLE, receiving side | `react-native-ble-plx` (scan, connect, read/write) |
| BLE, sharing side | `findit-native` module: Android `BluetoothGattServer` + `BluetoothLeAdvertiser` |

`react-native-ble-plx` only supports the central role, so a small Kotlin module provides the
peripheral (server) role. The same module provides satellite counts, which `expo-location` does not expose.

Because of the native code, the app needs a **development build**; it will not run in Expo Go.

## Data model (SQLite)

```sql
CREATE TABLE locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  accuracy REAL,                       -- metres, when captured from GPS
  notes TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'local', -- or the name of the user it came from
  created_at INTEGER NOT NULL           -- ms since epoch
);
CREATE TABLE settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
```

Migrations live in `source/src/db/schema.ts` and are tracked with `PRAGMA user_version`.
To change the schema, append a new migration to the list; never edit an old one.

## Compass maths

- Distance: haversine on a sphere of radius 6,371,008.8 m.
- Bearing: initial great-circle bearing, degrees clockwise from true north.
- Heading: `trueHeading` from `expo-location` when available, otherwise `magHeading`.
- Rose rotation = −heading. Arrow rotation = bearing − heading.
- Uncertainty radius = √(GPS accuracy² + recorded place accuracy²).

## Satellites

`GnssMonitor.kt` registers a `GnssStatus.Callback` and (because status only flows while the GPS
engine runs) a no-op GPS location listener. For each update it reports:

- **known**: every satellite in the status report;
- **in view**: satellites with a received signal (C/N0 > 0);
- **used**: satellites used in the current fix, also broken down by constellation.
