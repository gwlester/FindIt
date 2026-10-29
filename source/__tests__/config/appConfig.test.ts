import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..', '..');
const config = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8')).expo;
const NAVY = '#0B3D6B';

const pngSize = (file: string) => {
  const buf = readFileSync(join(root, file));
  expect(buf.subarray(1, 4).toString()).toBe('PNG');
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
};

test('uses the "B · Pin" adaptive icon on navy', () => {
  const icon = config.android.adaptiveIcon;
  expect(icon.backgroundColor).toBe(NAVY);
  for (const file of [config.icon, icon.foregroundImage, icon.backgroundImage, icon.monochromeImage]) {
    expect(existsSync(join(root, file))).toBe(true);
    expect(pngSize(file)).toEqual([1024, 1024]);
  }
});

test('shows the pin on a navy splash screen, in light and dark mode', () => {
  const splash = config.plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'expo-splash-screen');
  expect(splash).toBeDefined();
  const options = splash[1];
  expect(options).toMatchObject({ backgroundColor: NAVY, dark: { backgroundColor: NAVY } });
  expect(pngSize(options.image)).toEqual([1024, 1024]);
});
