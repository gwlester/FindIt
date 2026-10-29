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
        ├── formats/       GPX and GeoJSON import/export, file picking and sharing
        ├── hooks/         Position, heading, satellites, settings
        └── lib/           Geo maths, formatting, base64/UTF-8, averaging, smoothing, theme
    └── __tests__/         Jest tests (mirrors src/); helpers/ holds the mocks and test database
```

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Expo SDK 58, React Native 0.88, React 19.3, TypeScript 6 |
| Navigation | Expo Router (`source/src/app`) |
| Storage | `expo-sqlite` (local file `findit.db`). Places leave the phone only by Bluetooth sharing or an export; the map screen fetches tiles for the area shown from OpenFreeMap / USGS |
| GPS / heading | `expo-location` (`watchPositionAsync` at `BestForNavigation`, `watchHeadingAsync`) |
| Satellites | `findit-native` module: Android `GnssStatus` callback |
| Compass drawing | `react-native-svg` |
| Screen on | `expo-keep-awake` via `<KeepAwake tag>`: compass, averaging panel, Share screen while active |
| Import / export | GPX 1.1 and GeoJSON (`fast-xml-parser`), `expo-document-picker`, `expo-file-system`, `expo-sharing` |
| Tests | Jest (`jest-expo`) + React Native Testing Library 14, real SQLite via Node's `node:sqlite` |
| Maps | `@maplibre/maplibre-react-native` (MapLibre Native). Streets: OpenFreeMap vector style `liberty` (OpenStreetMap data, no key); satellite: USGS National Map `USGSImageryOnly` raster tiles (public domain, US only, to zoom 16). Sources in `src/lib/mapSources.ts` |
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
-- v2
CREATE TABLE finds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  place_id INTEGER NOT NULL,           -- deleted together with its place
  found_at INTEGER NOT NULL,           -- ms since epoch
  comment TEXT NOT NULL DEFAULT '',
  finder TEXT NOT NULL DEFAULT ''      -- '' = me, otherwise the FindIt user it came from
);
-- v3
CREATE TABLE share_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at INTEGER NOT NULL,                 -- ms since epoch, when they disconnected
  name TEXT NOT NULL,                  -- receiver's name, or 'FindIt user' (older versions)
  places INTEGER NOT NULL              -- distinct places they downloaded
);
```

Sharing history (`src/db/shareHistory.ts`): the Share screen records a row when a receiver that
downloaded at least one place disconnects (protocol v2, see [ble-protocol.md](ble-protocol.md)).
Rows older than the `shareHistoryDays` setting (7, 30, 90 (default) or 365 days; `off` =
forever) are pruned when the Share or Sharing history screen opens.

Finds (`src/db/finds.ts`): in **once** mode, marking again updates my latest find; in **log**
mode a find is added. Finds travel in exports and Bluetooth sharing only when the user says so:
GPX uses `<sym>Geocache Found</sym>` plus `<findit:find time>` (comment, finder) extensions;
GeoJSON a `finds` list; Bluetooth items an `f` array (oldest dropped first to fit). Imported
finds marked as the sender's own are attributed to the sender (Bluetooth) or kept as mine (a
file, e.g. my own export).

Migrations live in `source/src/db/schema.ts` and are tracked with `PRAGMA user_version`.
To change the schema, append a new migration to the list; never edit an old one.

## Offline maps (`src/lib/offlineMaps.ts`, `src/lib/tiles.ts`)

MapLibre offline packs. **Download** on the map saves the visible bounds for the current layer:
streets at zooms 10–14 (OpenFreeMap vector tiles stop at 14; higher zooms reuse them), satellite
at 10–16. Packs need a style URL, so the inline USGS style is written to
`usgs-satellite-style.json` in the document directory and its `file://` URL is used; tiles are
cached by URL, so the live map uses them too. A web-mercator tile count refuses areas over
6,000 tiles, to be polite to the free tile servers. Pack metadata holds `{name, layer,
createdAt}`; the name is "Near <place>" for the nearest place within 5 km, else coordinates.

## Map behind the compass (`src/components/CompassMap.tsx`, `src/lib/compassMap.ts`)

With Settings → Behind the search area set to Map or Satellite, the compass screen puts a
round, non-interactive MapLibre map under the SVG, sized to the inner circle. Its camera
follows your position with `bearing` = heading (heading-up) and a zoom from `zoomForScale`
(MapLibre: 512 dp per world at zoom 0), so the scale rings match the ground. The SVG then
leaves its faces transparent (the rose becomes a ring). Satellite falls back to the street
map outside USGS coverage.

## Import / export formats (`src/formats/`)

| | GPX 1.1 (XML) | GeoJSON (RFC 7946) |
| --- | --- | --- |
| Used by | geocaching.com, Garmin and other GPS units, c:geo, Locus, OsmAnd, Google Earth | web maps, geojson.io, QGIS |
| A place is | a waypoint `<wpt lat lon>` with `<name>`, `<desc>` (notes), `<time>`, `<sym>Geocache</sym>` | a `Point` feature, coordinates `[longitude, latitude]` |
| Accuracy | `<extensions><findit:accuracy>` (namespace `https://github.com/gwlester/findit/gpx/1`) | `properties.accuracy` |
| MIME / extension | `application/gpx+xml`, `.gpx` | `application/geo+json`, `.geojson` |

- **Export:** the user picks the format each time. The file is written to the cache directory
  and the Android share sheet opens.
- **Import:** the format is detected from the file extension, then the MIME type, then the
  first character of the content (`<` or `{`).
- **GPX import:**
  - The XML is validated first, and only waypoints are imported; routes and tracks count as skipped.
  - GPX 1.0 and 1.1 files from geocaching.com are understood. The place name is
    "Cache name (GC code)" and `Hint: …` from the Groundspeak extension goes into the notes.
- **GeoJSON import:** accepts a FeatureCollection, a Feature or a bare Point. `name` / `title`
  become the name, and `notes` / `description` / `desc` become the notes. Non-point
  geometries are skipped.
- Imported places are added with their source set to the file name. Duplicates (same name
  within ~1 m) are skipped, as with Bluetooth import.

## Tests

`npm test` runs the Jest suite in `source/__tests__/`, and `npm run test:coverage` also enforces
**at least 90% statement, branch, function and line coverage for every file** in `src/` and
`modules/findit-native/index.ts`. CI runs the coverage version.

- Screens, hooks and components are rendered with React Native Testing Library and driven
  like a user: pressing, typing, long-pressing.
- Database code runs against a real in-memory SQLite (Node's `node:sqlite`) behind the
  expo-sqlite API, so the SQL itself is tested.
- GPS, compass, the native GNSS/BLE module, Bluetooth scanning and navigation are replaced
  by controllable mocks in `__tests__/helpers/`. Tests emit fixes, headings, satellite
  status and scan results.
- The Kotlin module (`GnssMonitor.kt`, `ShareServer.kt`) isn't covered by these tests. It needs
  device or instrumented Android tests (see `prompts/ToDo.md`).

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

The same averaging is available on the compass screen (**Average my position**). There it
replaces the live position while you stand still, and stops automatically when a fix lands
more than 3× its accuracy (at least 10 m) from the average (`hasMovedAway`). Movement is only
judged once 3 fixes have been collected.

**Search area** (`src/lib/searchArea.ts`, compass). Within the switch distance (setting,
default 50 m, stored in metres; null = always the arrow) the compass's inner circle becomes a
map: the cache at its scaled distance and relative bearing, a shaded circle of the combined
uncertainty radius around it, and your own accuracy as a halo. The scale is the smallest round
value (10/20/50/100… m or 50/100/200… ft) that holds distance + radius.

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
