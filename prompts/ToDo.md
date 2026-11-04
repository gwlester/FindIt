# ToDo

Open work, roughly in priority order. Move items to `Done.md` when finished.

## Verify on hardware
- [ ] Sharing nearby on two phones after the precise-location fix: Look for nearby finds the
      other phone. If not, turn on Settings → Troubleshooting → Enable debug logging on both,
      try again, and share both debug logs.
- [ ] A long sharing name (over 20 bytes) still downloads (long write to NAME).

## Improvements
- [ ] Debug log upload: a "Send log to KnG" button (manual, with a confirmation) that uploads the debug log to a
      private KnG S3 bucket through a Lambda-issued upload link, with a 180-day lifecycle delete. Needs a KnG
      Terraform change, a privacy-page update (logs hold positions and Bluetooth names), and an API decision.
- [ ] In-app update check: look up the latest GitHub release, download `findcache.apk`, hand it to Android's
      installer. Sideload build only (Play forbids self-updating apps), so it must be left out of the Play AAB.
- [ ] 32-bit ARM APK (`work/findcache-32-bit`): after the PR build, check `unzip -l findcache.apk | grep lib/` shows
      `armeabi-v7a`, test-install on the Soyes XS15 (MT6580; maps are switched off there, `src/lib/mapSupport.ts`), then drop the
      "64-bit processor" lines from the KnG getting-started page and the FindCache page, say maps need a 64-bit
      phone, and move this to `Done.md`.
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
