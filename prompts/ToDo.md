# ToDo

Open work, roughly in priority order. Move items to `Done.md` when finished.

## Current wave (agreed 2026-10-29; one PR each, built test-first)
- [ ] App icon and splash screen: 2–3 concepts (Girl Scout green, blues) for the owner to
      review before one is used. **Owner merges this one.**

## Map wave (started 2026-10-29; map screen done)
- [ ] Compass display option: plain, map, or satellite behind the search area.
- [ ] Help: a help menu with About (version, short description, licence buttons), help for each
      screen, and an overall "how to use FindIt" guide.

## Verify on hardware
- [ ] Map screen: OpenFreeMap street tiles and USGS satellite tiles load, markers and the blue
      dot appear, and the ⓘ attribution opens (tile hosts can't be reached from the build sandbox).
- [ ] Offline maps: download a Map and a Satellite area, turn on airplane mode, restart the app,
      and check both show; delete one and check its size is freed.
- [ ] Test Bluetooth sharing between two Android phones (Android 12+ and, if possible, ≤ 11),
      including several places, long notes, and two receivers at once.
- [ ] Sharing history: a v2 receiver appears by name, a v1 (older) one as "FindIt user", and a
      phone that connects but downloads nothing isn't recorded.

## Improvements
- [ ] Optional, repo owner: Settings → General → Pull Requests → "Automatically delete head
      branches" (the cleanup workflow already deletes merged branches).
- [ ] Android tests for the Kotlin module (`GnssMonitor.kt`, `ShareServer.kt`); not covered by the Jest suite.
- [ ] Try importing a real geocaching.com pocket-query GPX and a GPX exported from a Garmin unit.
- [ ] Release signing with a real keystore (GitHub secret) instead of the debug key.
