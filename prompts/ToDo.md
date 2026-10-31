# ToDo

Open work, roughly in priority order. Move items to `Done.md` when finished.

## Improvements
- [ ] Check the next `master` release build produces the signed AAB `findcache-aab-<commit>`
      (the `ANDROID_RELEASE_*` secrets are set).
- [ ] Owner: promote the KnG site to live (KnG repo → Actions → Deploy to AWS → Run workflow, then
      approve `production-switch`) so `findcache.html` and `findcache-privacy.html` are public; the
      Play listing links to them.
- [ ] Google Play: follow `store/PLAY-CONSOLE-ANSWERS.md` (the contact email is still to confirm), then
      create the app and run the closed test.
- [ ] Confirm `SYSTEM_ALERT_WINDOW` is gone from the next release APK (`aapt2 dump badging`).
- [ ] Optional, repo owner: Settings → General → Pull Requests → "Automatically delete head
      branches" (the cleanup workflow already deletes merged branches).
- [ ] Android tests for the Kotlin module (`GnssMonitor.kt`, `ShareServer.kt`); not covered by the Jest suite.
- [ ] Try importing a real geocaching.com pocket-query GPX and a GPX exported from a Garmin unit.
