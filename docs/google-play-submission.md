# Google Play submission: FindCache

Everything needed to create the FindCache listing in Play Console, in one place. Modelled on
the Virtual Church Musician package (`VirtualChurchMusician/docs/GOOGLE_PLAY_SUBMISSION_INFO.md`
and `google_play_package/*/listing.md`). Items marked **DECIDE** or **TODO** need Gerald before
submitting.

Assets live in [`store/`](../store):

| File | Use |
| --- | --- |
| `store/graphics/icon-512.png` | App icon (512×512, resized from `source/assets/icon.png`) |
| `store/graphics/feature-graphic-1024x500.png` | Feature graphic (generated, see AI declaration) |
| `store/screenshots/phone/01…06-*.png` | Phone screenshots, 1350×2560, captioned (upload these) |
| `store/screenshots/raw/01…06-*.png` | The same six as captured, 1080×2400, no frame |
| `store/screenshots/tablet-7/01…06-*.png` | 7-inch tablet screenshots, 1200×1785 (portrait; `raw/` holds the uncropped 1200×1920 captures) |
| `store/screenshots/tablet-10/01…06-*.png` | 10-inch tablet screenshots, 1600×2432 (`raw/` holds the uncropped 1600×2560 captures) |
| `store/PLAY-CONSOLE-ANSWERS.md` | Step-by-step answers for every Play Console prompt |

## 1. Developer account (same as the Virtual Church Musician apps)

- **Account type:** Individual, Gerald Lester (not KnG Consulting, LLC)
- **Contact email:** `inquiries@kng-consulting.com` (**DECIDE**: confirm this address for FindCache)
- **Website (store listing):** `https://www.kng-consulting.com/findcache.html`
- Name and address for verification: see `VirtualChurchMusician/licenses/agreement.md`.
- **Testing requirement:** a personal account created after Nov 2023 needs a **closed test with
  at least 12 testers opted in for 14 continuous days** before it can apply for production
  access. If the existing account already has production access this may not apply; check the
  Dashboard banner. VCM's closed-test join links look like
  `https://play.google.com/apps/testing/<package>`.

## 2. Create app

| Field | Value |
| --- | --- |
| App name | **FindCache** (30 chars max) |
| Package name (`applicationId`, permanent once created) | `com.gwlester.findcache` |
| App or game | App |
| Free or paid | Free (cannot be changed to paid later) |
| Default language | English (United States) |
| Category | **Maps & Navigation** (alternative: Travel & Local) |
| Tags | Navigation, Outdoors, Geocaching (pick from the console's list) |

The name "FindIt" was dropped because another Android app uses it; search Play for "FindCache"
before creating to confirm the name is free (checked: not used, 2026-10-31).

## 3. Store listing

**Short description** (80 max, 74 used):

> Save places and a compass guides you back: geocaching-style, no account.

**Full description** (4000 max):

```text
FindCache is a simple, private geocaching-style app. Save a place, then let the compass bring you back to it.

SAVE PLACES
• Save your current position with one tap, or type in coordinates.
• Average your position over several GPS fixes to get a more accurate point.
• Add notes, mark a place as found, and keep a log comment.

FIND THEM AGAIN
• A compass rose keeps N, E, S and W on the real directions and points to your place.
• See the approximate distance and an uncertainty radius based on GPS accuracy.
• Live GPS satellite counts (used, in view, known) show how good your fix is.
• Close to a cache, the compass shows a search-area circle, optionally over a street map.

MAPS
• Free street maps (OpenStreetMap data via OpenFreeMap) and satellite imagery in the United States (USGS).
• Download areas for offline use, so maps still work with no signal.

SHARE AND SWAP
• Swap places with other FindCache users nearby over Bluetooth. No account and no internet needed.
• Import and export GPX files (geocaching.com, GPS units and other geocaching apps) or GeoJSON.

PRIVATE BY DESIGN
• No account, no ads, no analytics, no tracking.
• Your places are stored only on your phone. They leave it only when you share or export them.

FindCache is free and open source (BSD 2-Clause). Full user guide: https://www.kng-consulting.com/findcache.html
Source code: https://github.com/gwlester/FindIt
```

Keep the claims above true: re-check against `docs/wireframes.md` if features change.

**Contact details** (store listing): email `inquiries@kng-consulting.com`, website
`https://www.kng-consulting.com/findcache.html`. Phone number is optional; leave blank.

**Privacy policy URL:** `https://www.kng-consulting.com/findcache-privacy.html`, a page on the KnG
site that holds only the FindCache policy (source: [privacy-policy.md](privacy-policy.md); the KnG
policy at `/privacy.html` covers only Virtual Church Musician). The user guide for the app is the
page tree under `https://www.kng-consulting.com/findcache.html` (the KnG repo's `content/findcache/`).

## 4. Graphics and screenshots

- **Icon:** `icon-512.png` (512×512 PNG, under 1 MB).
- **Feature graphic:** `feature-graphic-1024x500.png`.
- **Phone screenshots** (2 to 8 required; Play wants each side 320 to 3840 px and the long side
  at most 2× the short side, so the raw 1080×2400 captures are too tall and are framed to
  1350×2560): places list, compass, map, share, import/export, settings. Captured on an
  Android 14 emulator (x86_64 build of the release APK) with five made-up places near Austin, TX and a
  mocked GPS fix, so no real locations appear. The tiles are real OpenFreeMap data.
- **7-inch and 10-inch tablet screenshots:** the same six screens (no captions), portrait,
  with the taskbar cropped off. The app is portrait-only, so a landscape tablet would show it
  letterboxed; the emulator is rotated to portrait instead. Captured on Android 14 emulators
  (`findcache_tablet_7`, set to 1920×1200 at 320 dpi, and `findcache_tablet_10`, 2560×1600),
  with the same made-up places and a mocked fix.
- **Recapturing:** build an x86_64 release APK (`npx expo prebuild --platform android` then
  `./gradlew assembleRelease -PreactNativeArchitectures=x86_64` in `source/android`; the CI APK is
  arm64 only and will not load on an x86_64 emulator), install, grant the location and Bluetooth
  permissions, seed the SQLite database (`files/SQLite/findit.db`, needs `adb root`), and set a
  location with `adb emu geo fix -97.7431 30.2672 150`.

### AI asset declaration

Answer **Label assets as created or edited using AI**, then per asset:

- `feature-graphic-1024x500.png`: **label as AI-created/edited** (generated by script, layout and text).
- `icon-512.png`: **don't label** (resize of the app's existing icon, `docs/branding`).
- Screenshots: **don't label** (real captures of the running app; the caption frame is added by script, so label them if you read "edited" strictly, the VCM package chose not to).

## 5. App content declarations

| Section | Answer |
| --- | --- |
| **App access** | All functionality is available without restrictions; no login exists. Choose "All functionality is available without special access". |
| **Ads** | No ads. |
| **Content rating** (IARC questionnaire) | Category: utility/reference. No violence, sexual content, drugs, gambling, user-generated content or user-to-user chat. Expect **Everyone**. Answer "No" to location sharing *with other users*: places are sent only when the user chooses, to phones nearby. |
| **Target audience** | 18+ or "13 and over", not directed at children. Not a Families app. |
| **News app** | No. |
| **Government / health / financial / COVID** | No to all. |
| **Data safety** | See below. |
| **Advertising ID** | Not used (declare "No"). |
| **Account deletion** | Not applicable: no accounts. |

### Data safety (**DECIDE** the map-tile line)

- Data is **encrypted in transit** (maps use HTTPS). Users can request deletion: **no data is held**; uninstalling removes everything.
- **Places, notes, display name, find log**: stored on the device only; shared only by a user-initiated Bluetooth transfer to a nearby phone or by a file the user exports. Not collected by the developer. Declare **not collected**.
- **Precise location** is read on the device to show distance and the compass, and is never sent to the developer. Declare **not collected**.
- **Map tiles** are requested from `tiles.openfreemap.org` and `basemap.nationalmap.gov` (USGS) over HTTPS. These requests reveal the area being viewed and the device's IP address to those third-party servers. Conservative answer: **Approximate location, collected, shared with third parties** (map providers), purpose **App functionality**, optional (the app works without maps), not used for ads. If you judge tile requests are not "location data", answer "No data collected or shared" like VCM. The conservative choice is safer against a Play data-safety mismatch rejection.
- No analytics, crash-reporting or ad SDKs (`source/package.json` has none).

### Permissions (declared in the manifest)

| Permission | Why | Play policy note |
| --- | --- | --- |
| `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` | Position for distance and the compass | Foreground only; no background location, so no extra declaration form |
| `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, `BLUETOOTH_ADVERTISE` (Android 12+); `BLUETOOTH`, `BLUETOOTH_ADMIN` (≤ 11) | Sharing places with nearby phones | None |
| `INTERNET`, `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE` | Download map tiles | None |
| `VIBRATE` | Added by React Native; the app's own code does not use it | None |
| `READ/WRITE_EXTERNAL_STORAGE` (max SDK 32) | Added by a library; file import/export uses the system file picker | None, but could be removed |
| `SYSTEM_ALERT_WINDOW` | Added by a development library, **not needed**. Now blocked in `app.json` (`blockedPermissions`). Verify with `aapt2 dump badging` on the next build that it is gone. | Play scrutinises it |

If Play Console asks for a **location permission** declaration or a "location in the foreground" video, the use is: show distance and bearing to a saved place while the screen is open.

## 6. Release build (CI ready; **TODO** add the keystore secrets)

- The CI build produces a **debug-signed arm64 APK** (`findcache.apk`). Play needs a **signed
  AAB** (`./gradlew bundleRelease`) with an **upload keystore**, and a 64-bit build (arm64-v8a is
  fine; add x86_64 only if you want Chromebooks/emulators).
- VCM already solved this: `VirtualChurchMusician/.github/workflows/release.yml` decodes
  `ANDROID_RELEASE_KEYSTORE_BASE64` plus `…_PASSWORD`, alias and key password secrets into a
  keystore. Reuse the pattern (a separate upload key for FindCache is cleaner) and enrol the app
  in **Play App Signing** when first uploading.
- CI now builds the signed AAB on release builds once the four `ANDROID_RELEASE_*` secrets are
  added (see `docs/building.md`); never commit a keystore.
- **Version:** `versionCode` is `YYMMDDNNN` and `versionName` is `YYYY.MM.DD.NNN`, both set by the
  workflow at release time. Play needs a higher `versionCode` for every upload.
- **SDK levels:** `targetSdkVersion` 36, compile SDK 37 (Expo SDK 58 / React Native 0.88). Min
  SDK 24 (Android 7). Re-check against Play's current target-API deadline when you submit.
- **Devices:** the app declares Bluetooth LE and GPS as features; non-LE phones are filtered out by Play, which is intended.

## 7. Console walk-through checklist

1. Create app (section 2). Accept the declarations (Play policy, US export laws).
2. Set up your app → App access, Ads, Content rating, Target audience, Data safety, Government apps, Financial features, Health (sections 5 and 3).
3. Main store listing: name, descriptions, icon, feature graphic, phone screenshots, category, contact details, privacy policy URL (sections 3, 4).
4. Testing → Internal testing, upload the signed AAB, add yourself. Then Closed testing with the 12 testers for 14 days if required (section 1).
5. Production → promote the tested release; write release notes (the first one can be "First release").
6. After approval, put the Play URL
   (`https://play.google.com/store/apps/details?id=com.gwlester.findcache`) in the README.

## 8. Release notes for 1.0

```text
First release of FindCache: save places, find them with a compass, view maps (online or offline), share places with nearby phones over Bluetooth, and import or export GPX and GeoJSON.
```

### Recapturing tablet screenshots

The `vcm_tablet_*` AVDs have `hw.gps = no`, so no location fix ever arrives; use copies
(`findcache_tablet_7/10`, same files with `hw.gps = yes`). Run the emulator on a virtual X server
(`xvfb-run -a emulator -avd findcache_tablet_10 -no-snapshot -no-audio -gpu swiftshader_indirect`),
not on the desktop. After the app is open: `adb shell cmd window user-rotation lock 1` (portrait;
this resets whenever the app is relaunched), `adb emu geo fix -97.7431 30.2672 150` a few times, and
`adb shell cmd uimode night no`. Seed places as above (`adb root`, then `adb unroot` before the
run so the shell isn't uid 0), and capture with `adb exec-out screencap -p`.
