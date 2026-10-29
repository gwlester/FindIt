# ToDo

Open work, roughly in priority order. Move items to `Done.md` when finished.

## Verify on hardware
- [ ] Map screen: OpenFreeMap street tiles and USGS satellite tiles load, markers and the blue
      dot appear, and the ⓘ attribution opens (tile hosts can't be reached from the build sandbox).
- [ ] Compass map: inside the search area the map/satellite disc lines up with the rings (a
      known 20 m feature sits on the 20 m ring), turns with the phone, and shows in airplane
      mode where an offline map was saved.
- [ ] Offline maps: download a Map and a Satellite area, turn on airplane mode, restart the app,
      and check both show; delete one and check its size is freed.
- [ ] Test Bluetooth sharing between two Android phones (Android 12+ and, if possible, ≤ 11),
      including several places, long notes, and two receivers at once.
- [ ] Check the new launcher icon (round and squircle launchers, themed icons on Android 13+)
      and the navy splash screen in light and dark mode.
- [ ] Sharing history: a v2 receiver appears by name, a v1 (older) one as "FindCache user", and a
      phone that connects but downloads nothing isn't recorded.

## Improvements
- [ ] Optional, repo owner: Settings → General → Pull Requests → "Automatically delete head
      branches" (the cleanup workflow already deletes merged branches).
- [ ] Android tests for the Kotlin module (`GnssMonitor.kt`, `ShareServer.kt`); not covered by the Jest suite.
- [ ] Try importing a real geocaching.com pocket-query GPX and a GPX exported from a Garmin unit.
- [ ] Release signing with a real keystore (GitHub secret) instead of the debug key.
