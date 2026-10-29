// Exports one concept's SVG layers to the app's 1024×1024 PNG assets. Needs Playwright + Chromium:
//   node docs/branding/export_png.js docs/branding b-pin source/assets
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const [dir, concept, out] = process.argv.slice(2);
const files = {
  'icon.png': 'icon', // legacy (non-adaptive) icon: both layers
  'android-icon-foreground.png': 'foreground',
  'android-icon-background.png': 'background',
  'android-icon-monochrome.png': 'monochrome',
  'splash-icon.png': 'foreground',
};
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
  for (const [png, layer] of Object.entries(files)) {
    const svg = fs.readFileSync(path.join(dir, `${concept}-${layer}.svg`), 'utf8');
    await p.setContent(`<body style="margin:0;background:transparent">${svg}</body>`);
    await p.screenshot({ path: path.join(out, png), omitBackground: true, clip: { x: 0, y: 0, width: 1024, height: 1024 } });
  }
  await b.close();
})();
