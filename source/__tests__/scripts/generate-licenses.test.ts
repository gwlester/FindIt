import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildLicenses, licenseFor, main, packagesFromSourceMap } from '../../scripts/generate-licenses';

function fakeProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'licenses-'));
  const pkg = (name: string, json: object, files: Record<string, string> = {}) => {
    const dir = path.join(root, 'node_modules', name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name, ...json }));
    for (const [f, text] of Object.entries(files)) fs.writeFileSync(path.join(dir, f), text);
  };
  pkg('alpha', { version: '1.0.0', license: 'MIT' }, { LICENSE: 'MIT text for alpha' });
  pkg('@scope/beta', { version: '2.1.0', license: { type: 'BSD-3-Clause' } }, { 'license.md': 'BSD text' });
  pkg('gamma', { version: '0.1.0', license: 'ISC', homepage: 'https://gamma.example' });
  pkg('delta', { version: '3.0.0' });
  return root;
}

test('finds the packages bundled into the app from the source map', () => {
  const map = {
    sources: [
      '/src/app/index.tsx',
      '/node_modules/alpha/index.js',
      '/node_modules/alpha/lib/x.js',
      '/node_modules/@scope/beta/index.js',
      '/node_modules/alpha/node_modules/gamma/index.js',
    ],
  };
  // Each package's folder, relative to the project (source map paths start at the project root).
  expect(packagesFromSourceMap(map)).toEqual([
    { name: '@scope/beta', dir: 'node_modules/@scope/beta' },
    { name: 'alpha', dir: 'node_modules/alpha' },
    { name: 'gamma', dir: 'node_modules/alpha/node_modules/gamma' },
  ]);
});

test('reads each package’s licence name and text', () => {
  const root = fakeProject();
  expect(licenseFor(root, { name: 'alpha', dir: 'node_modules/alpha' }).version).toBe('1.0.0');
  expect(licenseFor(root, 'alpha')).toEqual({ name: 'alpha', version: '1.0.0', license: 'MIT', text: 'MIT text for alpha' });
  expect(licenseFor(root, '@scope/beta')).toMatchObject({ license: 'BSD-3-Clause', text: 'BSD text' });
  expect(licenseFor(root, 'gamma').text).toBe('ISC licence. No licence file is included; see https://gamma.example');
  expect(licenseFor(root, 'delta')).toMatchObject({ license: 'UNKNOWN', text: 'UNKNOWN licence. No licence file is included.' });
});

test('builds the app licence, bundled packages (sorted) and native libraries', () => {
  const root = fakeProject();
  const native = [{ name: 'Lib', license: 'Apache-2.0', url: 'https://lib.example/LICENSE' }];
  const result = buildLicenses({
    rootDir: root,
    packages: [
      { name: 'gamma', dir: 'node_modules/gamma' },
      { name: 'alpha', dir: 'node_modules/alpha' },
    ],
    native,
    appLicense: 'BSD app text',
  });
  expect(result.app).toBe('BSD app text');
  expect(result.packages.map((p) => p.name)).toEqual(['alpha', 'gamma']);
  expect(result.native).toEqual(native);
});

test('main writes the JSON from a source map, the repo LICENSE and the native list', () => {
  const root = fakeProject();
  fs.mkdirSync(path.join(root, 'scripts'));
  fs.writeFileSync(
    path.join(root, 'scripts', 'native-licenses.json'),
    JSON.stringify([
      { name: 'Lib', license: 'MIT', url: 'u' },
      { name: 'Big', license: 'Apache-2.0', url: 'v', textFile: 'licenses/Apache-2.0.txt' },
    ]),
  );
  fs.mkdirSync(path.join(root, 'scripts', 'licenses'));
  fs.writeFileSync(path.join(root, 'scripts', 'licenses', 'Apache-2.0.txt'), 'Apache text\n');
  const repoLicense = path.join(root, 'LICENSE');
  fs.writeFileSync(repoLicense, 'App licence');
  const map = path.join(root, 'bundle.map');
  fs.writeFileSync(map, JSON.stringify({ sources: ['/node_modules/alpha/a.js'] }));
  const out = path.join(root, 'out.json');
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  main(['node', 'generate-licenses.js', map, '--root', root, '--app-license', repoLicense, '--out', out]);
  const json = JSON.parse(fs.readFileSync(out, 'utf8'));
  expect(json).toEqual({
    app: 'App licence',
    packages: [{ name: 'alpha', version: '1.0.0', license: 'MIT', text: 'MIT text for alpha' }],
    native: [
      { name: 'Lib', license: 'MIT', url: 'u' },
      { name: 'Big', license: 'Apache-2.0', url: 'v', text: 'Apache text' },
    ],
  });
  expect(log).toHaveBeenCalledWith(`Wrote 1 package licences and 2 native libraries to ${out}`);
});

test('main defaults: src/help/licenses.json under the root, and the LICENSE beside it', () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'licenses-parent-'));
  const root = fakeProject();
  const project = path.join(parent, 'source');
  fs.renameSync(root, project);
  fs.mkdirSync(path.join(project, 'scripts'));
  fs.writeFileSync(path.join(project, 'scripts', 'native-licenses.json'), '[]');
  fs.mkdirSync(path.join(project, 'src', 'help'), { recursive: true });
  fs.writeFileSync(path.join(parent, 'LICENSE'), 'Repo licence\n');
  const map = path.join(project, 'bundle.map');
  fs.writeFileSync(map, JSON.stringify({ sources: ['/node_modules/alpha/a.js', '/node_modules/alpha/b.js', '/src/x.ts'] }));
  jest.spyOn(console, 'log').mockImplementation(() => {});
  main(['node', 'generate-licenses.js', map, '--root', project]);
  const json = JSON.parse(fs.readFileSync(path.join(project, 'src', 'help', 'licenses.json'), 'utf8'));
  expect(json.app).toBe('Repo licence');
  expect(json.packages.map((p: { name: string }) => p.name)).toEqual(['alpha']);
});

test('the same package in two folders is listed twice, sorted by folder', () => {
  const map = { sources: ['/node_modules/b/node_modules/a/x.js', '/node_modules/a/x.js'] };
  expect(packagesFromSourceMap(map).map((p) => p.dir)).toEqual(['node_modules/a', 'node_modules/b/node_modules/a']);
});

test('main needs a source map', () => {
  expect(() => main(['node', 'generate-licenses.js'])).toThrow(/Usage/);
  expect(() => main(['node', 'generate-licenses.js', '--root', 'x'])).toThrow(/Usage/);
});
