# ToDo

Open work, roughly in priority order. Move items to `Done.md` when finished.

## Verify on hardware
- [X] Install the latest release APK (README download link) on a phone.
- [X] Check the compass on a real phone: rose orientation, arrow direction, true vs magnetic heading.
- [X] Check satellite counts against a GNSS test app (e.g. GPSTest), with High-accuracy GPS on and off.
- [X] Field-test position averaging: average for 1–2 min at a known point (survey marker) and
      compare the error with the reported accuracy, in open sky and under trees.
- [ ] Test Bluetooth sharing between two Android phones (Android 12+ and, if possible, ≤ 11),
      including several places, long notes, and two receivers at once.

## Improvements
- [X] Keep the screen awake on the compass screen (`expo-keep-awake`).
- [X] Show a "connected/downloaded by" count history on the sharing side.
- [X] Add setting for distance to switch from arrow to search circle
- [X] Mark places as found, with date and comment. Optional based on a setting.
- [X] App icon and splash screen artwork (currently Expo defaults).
- [ ] Optional, repo owner: Settings → General → Pull Requests → "Automatically delete head
      branches" (the cleanup workflow already deletes merged branches).
- [ ] Android tests for the Kotlin module (`GnssMonitor.kt`, `ShareServer.kt`); not covered by the Jest suite.
- [ ] Try importing a real geocaching.com pocket-query GPX and a GPX exported from a Garmin unit.
- [ ] Release signing with a real keystore (GitHub secret) instead of the debug key.

## Ideas (not committed)
- [ ] Optional map view. Question: where would we get the map from?
