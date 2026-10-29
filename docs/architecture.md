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

## Getting the most accuracy from GPS

The phone's GNSS chipset decides which satellites go into a fix; apps can't add satellites
to it. Satellites that are in view but unused usually have too weak or reflected a signal,
are too low in the sky, or haven't had their orbit data (ephemeris) downloaded yet. FindIt
improves accuracy in three ways:

**Position averaging** (`src/lib/averaging.ts`, Add/Edit place). It averages the fixes collected
while standing still, weighting each by 1/accuracy² and ignoring fixes worse than 30 m. GPS
errors drift slowly, so a minute of 1 Hz fixes holds only a few independent samples. The
reported accuracy is therefore the largest of:
- the typical fix accuracy (or the spread of the fixes, if larger) divided by
  √(duration / 45 s);
- a batch-means estimate: how much the averages of six consecutive blocks of fixes disagree;
- a third of the best single fix, because systematic errors such as multipath don't average out.

The 45 s figure was tuned by simulating GPS errors that drift over time. The true error lands
within the reported accuracy about 88–97 % of the time in open sky and 75–85 % under trees.
Errors that drift over several minutes (strong multipath) can't be seen in a short session,
so there the estimate is optimistic. Averaging for longer helps.

**Full GNSS tracking** (`GnssMonitor.kt`, Android 12+, setting *High-accuracy GPS*). While the
compass or averaging panel is open, the app registers for raw GNSS measurements with
`GnssMeasurementRequest.setFullTracking(true)`. This stops the chipset duty-cycling, so it keeps
tracking every satellite continuously. That tends to keep more satellites in the fix and the fix
steadier, at the cost of battery. How much it helps depends on the phone.

**Display smoothing** (`src/lib/smoothing.ts`, compass). The heading is smoothed on the circle
(so 359° and 1° average to 0°) and the position exponentially. Smoothing restarts after a
10 s gap or a jump of more than 3× the reported accuracy, so it never lags far behind. It
steadies the display; it doesn't make the fix itself more accurate.

## Satellites

`GnssMonitor.kt` registers a `GnssStatus.Callback` and (because status only flows while the GPS
engine runs) a no-op GPS location listener. For each update it reports:

- **known**: every satellite in the status report;
- **in view**: satellites with a received signal (C/N0 > 0);
- **used**: satellites used in the current fix, also broken down by constellation.
