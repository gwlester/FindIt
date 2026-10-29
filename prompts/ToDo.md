# ToDo

Open work, roughly in priority order. Move items to `Done.md` when finished.

## Map wave (started 2026-10-29; map screen done)
- [ ] Offline maps: download an area (streets and/or satellite) before heading out so maps work
      in airplane mode; list and delete downloads.
- [ ] Compass display option: plain, map, or satellite behind the search area.
- [ ] Help: a help menu with About (version, short description, licence buttons), help for each
      screen, and an overall "how to use FindIt" guide.

## Verify on hardware
- [ ] Map screen: OpenFreeMap street tiles and USGS satellite tiles load, markers and the blue
      dot appear, and the ⓘ attribution opens (tile hosts can't be reached from the build sandbox).
- [ ] Test Bluetooth sharing between two Android phones (Android 12+ and, if possible, ≤ 11),
      including several places, long notes, and two receivers at once.
- [ ] Check the new launcher icon (round and squircle launchers, themed icons on Android 13+)
      and the navy splash screen in light and dark mode.
- [ ] Sharing history: a v2 receiver appears by name, a v1 (older) one as "FindIt user", and a
      phone that connects but downloads nothing isn't recorded.

## Improvements
- [ ] Optional, repo owner: Settings → General → Pull Requests → "Automatically delete head
      branches" (the cleanup workflow already deletes merged branches).
- [ ] Android tests for the Kotlin module (`GnssMonitor.kt`, `ShareServer.kt`); not covered by the Jest suite.
- [ ] Try importing a real geocaching.com pocket-query GPX and a GPX exported from a Garmin unit.
- [ ] Release signing with a real keystore (GitHub secret) instead of the debug key.
