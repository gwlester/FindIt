# FindCache: Play Console, what to answer

Follow top to bottom in Play Console. Everything here is a decided answer; copy and paste.
Background and reasoning are in [docs/google-play-submission.md](../docs/google-play-submission.md).
Files named below are in this `store/` folder.

Two answers are judgement calls I made for you, marked **(my pick)**: change them if you disagree.

## 0. Before you start

- Sign in to the existing developer account (Individual, Gerald Lester), the one used for
  Virtual Church Musician.
- The name **FindCache** is free on Play (checked by the owner on 2026-10-31).
- **Make the KnG pages live first.** They are merged and on `https://preview.kng-consulting.com`, but
  KnG pushes only update the preview: run **Actions → Deploy to AWS → Run workflow** in the KnG repo
  and approve the `production-switch` step. Play checks the privacy-policy URL when you save it.
- The KnG site pages used below (live after that step): `https://www.kng-consulting.com/findcache.html` (overview
  and user guide) and `https://www.kng-consulting.com/findcache-privacy.html` (the privacy policy).
- The signed AAB comes from CI: after a `master` build with the `ANDROID_RELEASE_*` secrets set,
  download the artifact `findcache-aab-<commit>` from the run (kept 7 days).

## 1. Create app (All apps → Create app)

| Prompt | Answer |
| --- | --- |
| App name | `FindCache` |
| Default language | English (United States) – en-US |
| App or game | App |
| Free or paid | Free |
| Declarations: Developer Program Policies | Tick |
| Declarations: US export laws | Tick |

The package name `com.gwlester.findcache` is taken from the first AAB you upload (it can't be changed later).

## 2. Set up your app (Dashboard tasks)

### App access
**All functionality is available without special access.** (No login exists.)

### Ads
**No, my app does not contain ads.**

### Content rating (questionnaire)
- Email: `inquiries@kng-consulting.com`
- Category: **All other app types** (utility, reference or productivity).
- Violence, sexual content, profanity, controlled substances, gambling: **No** to all.
- Does the app let users interact or exchange content/location with other users: **No**.
  (Places are only sent when the user picks them, over Bluetooth to a phone nearby. There is no
  chat, account, or online sharing.)
- Shares the user's current physical location with other users: **No**.
- Unrestricted internet access / web browsing: **No**.
- Expected rating: **Everyone** (IARC: PEGI 3, USK 0, ESRB Everyone).

### Target audience and content
- Target age groups: **18 and over** (my pick; "13–15", "16–17" and "18+" is also acceptable).
  Do **not** tick any group under 13.
- Appeals to children: **No**.

### News apps
**No.**

### COVID-19 contact tracing and status apps
**No** (not a COVID-19 app).

### Data safety
Start with **Does your app collect or share any of the required user data types: Yes**
(my pick, conservative: the map tiles reveal the viewed area to the map hosts).

Then:

| Prompt | Answer |
| --- | --- |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (HTTPS) |
| Do you provide a way for users to request data deletion? | **No data is held by the developer.** Choose the option that says users can't request deletion because nothing is stored on your servers, or the wording closest to "data is only on the device, uninstall to delete". |

Data types, declare only this one:

- **Location → Approximate location**
  - Collected: **Yes**. Shared: **Yes** (with the map providers OpenFreeMap and USGS).
  - Processed ephemerally: **Yes**.
  - Required or optional: **Optional** (the app works without maps).
  - Purpose: **App functionality**. Nothing else (no analytics, advertising, personalisation).

Everything else: **not collected**. That covers precise location (read on the device only, never
sent anywhere), places, notes, the display name and the find log (stored on the device, shared
only by a user-started Bluetooth transfer or a file the user exports), personal info, financial
info, contacts, photos, files, app activity, device IDs.

If you'd rather say "no data collected" (as for Virtual Church Musician), Play may later flag a
mismatch with the map requests, so I advise against it.

### Government apps
**No.**

### Financial features
**My app doesn't provide any financial features.**

### Health apps
**My app does not have any health features.**

### Advertising ID
**No**, the app does not use an advertising ID.

### Data / account deletion
Not applicable: the app has no accounts.

### Permissions declarations
Foreground location only, with no background access, so there is **no** extra declaration form.
If Play asks about location use, say: *"Shows the distance and bearing to a saved place while the screen is open."*

## 3. Store settings

| Prompt | Answer |
| --- | --- |
| App category | **Maps & Navigation** |
| Tags | Navigation, Outdoors, Geocaching (take what the list offers) |
| Store listing contact email | `inquiries@kng-consulting.com` |
| Website | `https://www.kng-consulting.com/findcache.html` (the FindCache page and user guide) |
| Phone | leave blank |
| External marketing | leave on |

## 4. Main store listing (en-US)

**App name:** `FindCache`

**Short description:**
```text
Save places and a compass guides you back: geocaching-style, no account.
```

**Full description:**
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

**Graphics**

| Slot | File |
| --- | --- |
| App icon | `graphics/icon-512.png` |
| Feature graphic | `graphics/feature-graphic-1024x500.png` |
| Phone screenshots (upload all 6, in order) | `screenshots/phone/01-places.png` … `06-settings.png` |
| 7-inch tablet screenshots | `screenshots/tablet-7/01…06-*.png` |
| 10-inch tablet screenshots | `screenshots/tablet-10/01…06-*.png` |
| Chromebook screenshots | skip |

**Privacy policy URL** (Policy → App content → Privacy policy):
```text
https://www.kng-consulting.com/findcache-privacy.html
```
It is a page that holds only the FindCache policy (same text as `docs/privacy-policy.md`). The
Virtual Church Musician policy doesn't cover this app, so don't reuse it.

**User guide:** the full description ends with a link to the guide, and the store-listing
**Website** field points at the same overview page. The guide pages, if Play or a tester asks for
more detail: `https://www.kng-consulting.com/findcache-getting-started.html`,
`findcache-finding-a-place.html`, `findcache-maps.html`, `findcache-sharing.html` and
`findcache-help.html` on the same site.

**AI-generated content labels** (Graphics → "Label assets as created or edited using AI"):

| Asset | Label as AI? |
| --- | --- |
| `feature-graphic-1024x500.png` | **Yes**, created by script/AI |
| `icon-512.png` | No |
| Phone and tablet screenshots | No (real captures of the running app) |

## 5. Testing and release

A personal account made after Nov 2023 needs a **closed test with at least 12 testers opted in
for 14 continuous days** before applying for production. Check the Dashboard banner; if your
account already has production access, you can skip the closed test.

1. **Testing → Internal testing → Create new release.**
   - Play App Signing: **Continue** (let Google manage the app signing key; your keystore is the upload key).
   - Upload the `.aab`. Release name: leave the suggested name. Release notes:
     ```text
     <en-US>
     First release of FindCache.
     </en-US>
     ```
   - Add yourself under Testers → create an email list → Save → Start rollout.
2. **Testing → Closed testing → Create track** (name `Closed testing`), add a list of 12+
   testers, upload the same AAB (or promote from internal), roll out, and send the testers the join link.
3. After 14 days: **Dashboard → Apply for production**, answer the questions honestly
   (testers' feedback, how you ran the test), then **Production → Create release**.
4. **Countries/regions:** all countries (satellite imagery is US only; the listing says so).

## 6. If Play asks something not listed here

- **Foreground service / background location / SMS / call log / accessibility / VPN / all-files access:** the app uses none. Answer *No*.
- **Target API level:** the app targets API 36 (Android 16). If Play warns, tell me.
- **Device catalogue:** Bluetooth LE is required, so phones without it are filtered out. This is intended.
- **Crashes or Android vitals:** nothing to set up; there are no crash-reporting SDKs.
