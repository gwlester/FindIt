# FindIt

Simple geocache-type app for Android.

- Keep a list of named places (stored locally in SQLite).
- Pick one and a compass points to it. The rose keeps N/E/S/W on the real directions,
  with the approximate distance, an uncertainty radius and live GPS satellite counts below it.
- Share places with other FindIt users nearby over Bluetooth LE.

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
