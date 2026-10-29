// Renders preview.png from the concept SVGs. Needs Playwright + Chromium:
//   node docs/branding/preview.js docs/branding docs/branding/preview.png
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const dir = process.argv[2], out = process.argv[3];
const read = (f) => 'data:image/svg+xml;base64,' + Buffer.from(fs.readFileSync(path.join(dir, f))).toString('base64');
const concepts = [
  ['a-compass', 'A · Compass', '#00AE58'],
  ['b-pin', 'B · Pin', '#0B3D6B'],
  ['c-search-area', 'C · Search area', '#FFFFFF'],
];
const others = ['#e5534b', '#f2a33a', '#7a5af5', '#3ba1d8', '#9aa0a6', '#57b26b'];
const icon = (name, size, mask) =>
  `<div style="width:${size}px;height:${size}px;border-radius:${mask};overflow:hidden;position:relative;box-shadow:0 2px 6px #0005">
     <img src="${read(name + '-background.svg')}" style="position:absolute;width:150%;left:-25%;top:-25%">
     <img src="${read(name + '-foreground.svg')}" style="position:absolute;width:150%;left:-25%;top:-25%"></div>`;
const cell = (inner, label) => `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;width:84px">${inner}<span style="color:#fff;font-size:12px">${label}</span></div>`;
const html = `<body style="margin:0;font-family:Roboto,Arial,sans-serif;background:#eee;padding:16px;display:flex;gap:24px;width:1900px">
${concepts.map(([n, title, bg]) => `
 <div style="display:flex;flex-direction:column;gap:12px;align-items:center">
  <div style="font-size:22px;font-weight:700">${title}</div>
  <div style="display:flex;gap:12px;align-items:flex-end">
   ${icon(n, 192, '50%')} ${icon(n, 96, '28%')} ${icon(n, 48, '50%')}
   <div style="width:48px;height:48px;border-radius:50%;background:#dfe7d8;display:flex;align-items:center;justify-content:center;overflow:hidden">
     <img src="${read(n + '-monochrome.svg')}" style="width:72px;opacity:.7;filter:invert(23%) sepia(30%) saturate(500%) hue-rotate(60deg)"></div>
  </div>
  <div style="display:flex;gap:16px">
   <div style="width:300px;height:420px;border-radius:24px;background:linear-gradient(#35495e,#1c2833);padding:24px 12px;box-sizing:border-box;display:flex;flex-wrap:wrap;gap:18px 6px;align-content:flex-start">
     ${others.slice(0, 2).map((c) => cell(`<div style="width:56px;height:56px;border-radius:50%;background:${c}"></div>`, 'App')).join('')}
     ${cell(icon(n, 56, '50%'), 'FindCache')}
     ${others.slice(2).map((c) => cell(`<div style="width:56px;height:56px;border-radius:50%;background:${c}"></div>`, 'App')).join('')}
   </div>
   <div style="width:220px;height:420px;border-radius:24px;border:3px solid #333;background:${bg};display:flex;align-items:center;justify-content:center;box-sizing:border-box">
     <div style="width:150px;height:150px;border-radius:50%;overflow:hidden;position:relative">
       <img src="${read(n + '-foreground.svg')}" style="position:absolute;width:150%;left:-25%;top:-25%"></div>
   </div>
  </div>
  <div style="font-size:12px;color:#555">launcher circle 192/48 · squircle 96 · themed (mono) · home screen · splash</div>
 </div>`).join('')}
</body>`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1932, height: 600 } });
  await p.setContent(html); await p.waitForTimeout(300);
  await p.screenshot({ path: out, fullPage: true }); await b.close();
})();
