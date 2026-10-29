# App icon and splash concepts (for review)

Three concepts in Girl Scout green (`#00AE58`, deep `#00703C`) with blues (`#1F6FB2`, navy
`#0B3D6B`, sky `#BFE3F7`). Only the colours are borrowed: there is no Girl Scouts trefoil or
other mark. **None of these is used by the app yet.** Pick one (or ask for changes) and a
follow-up PR wires it in.

![Concepts: launcher sizes, themed icon, home screen and splash](preview.png)

Each concept is shown as a launcher icon (circle at 192 and 48 px, squircle at 96 px), as a
themed monochrome icon (Android 13+), on a home screen, and on the Android 12+ splash screen.

| Concept | Idea | Splash background |
| --- | --- | --- |
| **A · Compass** | White compass ring with a navy needle on green: says "find your way". Clearest at small sizes. It is close to other compass icons (e.g. Safari), so it's the least distinctive. | Green |
| **B · Pin** | Green map pin with a white compass star on a blue gradient: "a place" plus "direction". Distinctive and reads well at 48 px. | Navy |
| **C · Search area** | Blue search rings around a green check, on white: the compass's search-area view plus "found it". Lightest look; the outer dashed ring gets faint at 48 px. | White |

## Files

`generate_concepts.py` writes, for each concept, the adaptive-icon layers (`*-background.svg`,
`*-foreground.svg`, with the foreground kept inside the 66% safe zone), the combined
`*-icon.svg`, and `*-monochrome.svg`. `preview.js` renders `preview.png`.

```bash
python3 docs/branding/generate_concepts.py
node docs/branding/preview.js docs/branding docs/branding/preview.png
```

## Using the chosen concept (follow-up PR)

1. Export the chosen concept's SVGs to 1024×1024 PNGs, replacing `source/assets/icon.png`,
   `android-icon-foreground.png`, `android-icon-background.png`, `android-icon-monochrome.png`
   and `splash-icon.png` (the foreground layer).
2. In `app.json`, set `android.adaptiveIcon.backgroundColor` and add the `expo-splash-screen`
   plugin with `image: ./assets/splash-icon.png`, the concept's splash background colour, and a
   dark-mode variant.
3. Check the launcher icon and splash on a device (icons are cached; reinstall if needed).
