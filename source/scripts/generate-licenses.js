#!/usr/bin/env node
// Writes src/help/licenses.json for the About screen: FindIt's own licence, the licence of
// every npm package bundled into the app (taken from the bundle's source map), and the main
// native libraries (scripts/native-licenses.json). Re-run after changing dependencies:
//
//   npx expo export --platform android --source-maps --output-dir /tmp/findit-bundle
//   node scripts/generate-licenses.js /tmp/findit-bundle/_expo/static/js/android/*.map
//
// Options: --root <project dir> (default: this folder's parent), --app-license <file>
// (default: ../LICENSE), --out <file> (default: src/help/licenses.json).

const fs = require('node:fs');
const path = require('node:path');

const LICENSE_FILE = /^(licen[cs]e|copying)(\.|$)/i;

/**
 * Bundled packages from a source map's `sources` (paths from the project root): each
 * package's name and folder, nested node_modules included.
 */
function packagesFromSourceMap(map) {
  const found = new Map();
  for (const source of map.sources) {
    const i = source.lastIndexOf('node_modules/');
    if (i < 0) continue;
    const [first, second] = source.slice(i + 'node_modules/'.length).split('/');
    const name = first.startsWith('@') ? `${first}/${second}` : first;
    const dir = `${source.slice(0, i)}node_modules/${name}`.replace(/^\//, '');
    found.set(dir, { name, dir });
  }
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name) || a.dir.localeCompare(b.dir));
}

/** A package's version, licence name and licence text (or a pointer when it has no file). `pkgRef`: a name or {name, dir}. */
function licenseFor(rootDir, pkgRef) {
  const { name, dir: rel } = typeof pkgRef === 'string' ? { name: pkgRef, dir: `node_modules/${pkgRef}` } : pkgRef;
  const dir = path.join(rootDir, rel);
  const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  const license = (typeof pkg.license === 'object' ? pkg.license.type : pkg.license) || 'UNKNOWN';
  const file = fs.readdirSync(dir).find((f) => LICENSE_FILE.test(f));
  const text = file
    ? fs.readFileSync(path.join(dir, file), 'utf8').trim()
    : `${license} licence. No licence file is included${pkg.homepage ? `; see ${pkg.homepage}` : '.'}`;
  return { name, version: pkg.version, license, text };
}

function buildLicenses({ rootDir, packages, native, appLicense }) {
  return {
    app: appLicense,
    packages: [...packages].sort((a, b) => a.name.localeCompare(b.name)).map((p) => licenseFor(rootDir, p)),
    native,
  };
}

function main(argv) {
  const args = argv.slice(2);
  const option = (name) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const map = args[0];
  if (!map || map.startsWith('--')) throw new Error('Usage: generate-licenses.js <bundle source map> [--root dir] [--app-license file] [--out file]');
  const rootDir = option('root') ?? path.join(__dirname, '..');
  const out = option('out') ?? path.join(rootDir, 'src', 'help', 'licenses.json');
  const result = buildLicenses({
    rootDir,
    packages: packagesFromSourceMap(JSON.parse(fs.readFileSync(map, 'utf8'))),
    native: JSON.parse(fs.readFileSync(path.join(rootDir, 'scripts', 'native-licenses.json'), 'utf8')).map(
      // `textFile` (relative to scripts/) is replaced by the licence text it names.
      ({ textFile, ...lib }) =>
        textFile ? { ...lib, text: fs.readFileSync(path.join(rootDir, 'scripts', textFile), 'utf8').trim() } : lib,
    ),
    appLicense: fs.readFileSync(option('app-license') ?? path.join(rootDir, '..', 'LICENSE'), 'utf8').trim(),
  });
  fs.writeFileSync(out, `${JSON.stringify(result, null, 1)}\n`);
  console.log(`Wrote ${result.packages.length} package licences and ${result.native.length} native libraries to ${out}`);
}

/* istanbul ignore next -- only runs when executed directly */
if (require.main === module) main(process.argv);

module.exports = { buildLicenses, licenseFor, main, packagesFromSourceMap };
