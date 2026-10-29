import fs from 'node:fs';
import path from 'node:path';

import licenses from '../../src/help/licenses.json';

const root = path.join(__dirname, '..', '..');
const installed = (name: string) =>
  JSON.parse(fs.readFileSync(path.join(root, 'node_modules', name, 'package.json'), 'utf8')).version;

test('includes FindCache’s own licence (the repository LICENSE)', () => {
  expect(licenses.app).toBe(fs.readFileSync(path.join(root, '..', 'LICENSE'), 'utf8').trim());
});

test('covers the main libraries, at their installed versions (re-run the script after upgrades)', () => {
  const byName = new Map(licenses.packages.map((p) => [p.name, p]));
  for (const name of [
    'react',
    'react-native',
    'expo',
    'expo-router',
    'expo-sqlite',
    'expo-location',
    '@maplibre/maplibre-react-native',
    'react-native-ble-plx',
    'react-native-svg',
    'fast-xml-parser',
  ]) {
    expect(byName.get(name)?.version).toBe(installed(name));
  }
});

test('every entry has a licence and text', () => {
  for (const p of [...licenses.packages, ...licenses.native]) {
    expect(p.license).toBeTruthy();
    if ('text' in p) expect(p.text).toBeTruthy();
  }
  expect(licenses.native.map((n) => n.name)).toContain('MapLibre Native (Android)');
});
