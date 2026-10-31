# ToDo

Open work, roughly in priority order. Move items to `Done.md` when finished.

## Improvements
- [ ] Check the next `master` release build produces the signed AAB `findcache-aab-<commit>`
      (the `ANDROID_RELEASE_*` secrets are set).
- [ ] Google Play: decide the open items in `docs/google-play-submission.md` (contact email,
      privacy-policy URL, Data safety map-tile answer), confirm "FindCache" is free on Play, then
      create the app and run the closed test.
- [ ] Confirm `SYSTEM_ALERT_WINDOW` is gone from the next release APK (`aapt2 dump badging`).
- [ ] Optional, repo owner: Settings → General → Pull Requests → "Automatically delete head
      branches" (the cleanup workflow already deletes merged branches).
- [ ] Android tests for the Kotlin module (`GnssMonitor.kt`, `ShareServer.kt`); not covered by the Jest suite.
- [ ] Try importing a real geocaching.com pocket-query GPX and a GPX exported from a Garmin unit.
