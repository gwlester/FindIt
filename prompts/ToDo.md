# ToDo

Open work, roughly in priority order. Move items to `Done.md` when finished.

## Verify on hardware
- [ ] Sharing nearby on two phones after the precise-location fix: Look for nearby finds the
      other phone. If not, turn on Settings → Troubleshooting → Enable debug logging on both,
      try again, and share both debug logs.
- [ ] A long sharing name (over 20 bytes) still downloads (long write to NAME).

## Improvements
- [ ] iOS build of FindCache. Parked for now: no work started. Needs an Apple Developer Program enrollment, an iOS
      native module for the GNSS/BLE parts (`modules/findit-native` is Kotlin only), and a review of the Android-only
      features (satellite counts, sideload update check).
- [ ] Crash on the XS15 (2026.11.04.003, reported 2026-11-03 after the no-compass note appeared): the debug log from that
      run showed no crash and no `[compass]` lines. `work/crash-logging` adds a catch-all at the top level (global error handler installed when the root layout loads, an error boundary around the whole app with a "Something went wrong / Try again" screen, unhandled promise rejections) that writes `[crash]` entries (kept in memory until the debug-log setting is read), and a
      "previous run did not end in the background" note at the next start; reproduce with debug logging on and read the log.
- [ ] No-compass fallback + position source (`work/compass-no-sensor-fallback`): verify on the XS15 that the
      "No compass sensor found" note and a north-up arrow appear after 8 s, and read the `[compass]` log lines to
      confirm the phone really has no heading sensor. Position source is inferred from satellites in use.
- [ ] Debug log upload + update check (`work/gps-debug-and-update-check`): built and tested. To finish: the KnG
      branch `work/findcache-log-upload` needs `terraform apply` run locally (owner), then set `LOG_UPLOAD_URL`
      in `source/src/lib/logUpload.ts` from the `findcache_log_upload_url` output (the Send button stays hidden
      until then), merge the KnG branch, and update the KnG FindCache pages. Test "Check for updates" on a device
      (needs an older sideloaded build installed first), and confirm the Play AAB has no
      `REQUEST_INSTALL_PACKAGES` (`aapt2 dump badging`).
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
