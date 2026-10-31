# ToDo

Open work, roughly in priority order. Move items to `Done.md` when finished.

## Improvements
- [ ] Google Play: internal test installs and works; run the closed test (12+ testers opted in for
      14 continuous days, send them the join link); then Dashboard → Apply for production (target
      audience stays 18+).
- [ ] Once FindCache is findable on Google Play: replace the temporary sideload section on the KnG
      getting-started page with "Get it on Google Play" and switch the QR code to the Play link.
- [ ] Confirm `SYSTEM_ALERT_WINDOW` is gone from the next release APK (`aapt2 dump badging`).
- [ ] Optional, repo owner: Settings → General → Pull Requests → "Automatically delete head
      branches" (the cleanup workflow already deletes merged branches).
- [ ] Android tests for the Kotlin module (`GnssMonitor.kt`, `ShareServer.kt`); not covered by the Jest suite.
- [ ] Try importing a real geocaching.com pocket-query GPX and a GPX exported from a Garmin unit.
