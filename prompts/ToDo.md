# ToDo

Open work, roughly in priority order. Move items to `Done.md` when finished.

## Verify on hardware
- [ ] Install the latest release APK (README download link) on a phone.
- [ ] Check the compass on a real phone: rose orientation, arrow direction, true vs magnetic heading.
- [ ] Check satellite counts against a GNSS test app (e.g. GPSTest), with High-accuracy GPS on and off.
- [ ] Field-test position averaging: average for 1–2 min at a known point (survey marker) and
      compare the error with the reported accuracy, in open sky and under trees.
- [ ] Test Bluetooth sharing between two Android phones (Android 12+ and, if possible, ≤ 11),
      including several places, long notes, and two receivers at once.

## Improvements
- [ ] Release signing with a real keystore (GitHub secret) instead of the debug key.
- [ ] Keep the screen awake on the compass screen (`expo-keep-awake`).
- [ ] Automated unit tests (Jest) for `lib/geo.ts`, `lib/base64.ts`, `lib/averaging.ts`,
      `lib/smoothing.ts`, `ble/protocol.ts` (currently spot-checked with throwaway scripts).
- [ ] App icon and splash screen artwork (currently Expo defaults).
- [ ] Show a "connected / downloaded by" count history on the sharing side.

## Ideas (not committed)
- [ ] Import/export GPX files.
- [ ] Mark places as found, with date.
- [ ] Optional map view.
