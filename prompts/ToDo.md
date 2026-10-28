# ToDo

Open work, roughly in priority order. Move items to `Done.md` when finished.

## Verify on hardware
- [ ] Make sure the GitHub Actions build passes (it is the first real compile of
      `modules/findit-native`), then install the APK artifact on a phone.
- [ ] Merge to `master` and tag the first release (`v1.0.0`) so the README download link works.
- [ ] Check the compass on a real phone: rose orientation, arrow direction, true vs magnetic heading.
- [ ] Check satellite counts against a GNSS test app (e.g. GPSTest).
- [ ] Test Bluetooth sharing between two Android phones (Android 12+ and, if possible, ≤ 11),
      including several places, long notes, and two receivers at once.

## Improvements
- [ ] Release signing with a real keystore (GitHub secret) instead of the debug key.
- [ ] Keep the screen awake on the compass screen (`expo-keep-awake`).
- [ ] Smooth the heading (low-pass filter / animated rotation) so the rose doesn't jitter.
- [ ] Automated unit tests (Jest) for `lib/geo.ts`, `lib/base64.ts`, `ble/protocol.ts`.
- [ ] App icon and splash screen artwork (currently Expo defaults).
- [ ] Show a "connected / downloaded by" count history on the sharing side.

## Ideas (not committed)
- [ ] Import/export GPX files.
- [ ] Mark places as found, with date.
- [ ] Optional map view.
