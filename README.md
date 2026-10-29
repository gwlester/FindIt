# FindIt

Simple geocache-type app for Android.

- Keep a list of named places (stored locally in SQLite).
- Pick one and a compass points to it. The rose keeps N/E/S/W on the real directions,
  with the approximate distance, an uncertainty radius and live GPS satellite counts below it.
- Share places with other FindIt users nearby over Bluetooth LE.
- Import and export places as GPX (geocaching.com, GPS units, other geocaching apps) or GeoJSON.

## Download

**[⬇ Download the latest FindIt release (findit.apk)](https://github.com/gwlester/findit/releases/latest/download/findit.apk)**
([release notes and older versions](https://github.com/gwlester/findit/releases/latest)).
Android 7+ on 64-bit ARM phones. Open the file on the phone and allow installs from unknown
sources. Releases use date-based versions (e.g. `2026.10.28.001`), one per successful
build of `master`; the two newest are kept. They are currently signed with the debug key.

| Folder | Contents |
| --- | --- |
| [`source/`](source) | The Expo / React Native app |
| [`docs/`](docs) | Documentation and [screen wireframes](docs/wireframes.md) |
| [`prompts/`](prompts) | [`ToDo.md`](prompts/ToDo.md) and [`Done.md`](prompts/Done.md) |

Quick start (needs Android SDK + a phone; see [docs/building.md](docs/building.md)):

```bash
cd source
npm install
npx expo run:android
```
