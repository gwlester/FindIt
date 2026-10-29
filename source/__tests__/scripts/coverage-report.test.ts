import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { main, MARKER, toMarkdown } from '../../scripts/coverage-report';

const metric = (pct: number, total = 10) => ({ total, covered: Math.round((pct / 100) * total), skipped: 0, pct });
const entry = (s: number, b: number, f: number, l: number) => ({
  statements: metric(s),
  branches: metric(b),
  functions: metric(f),
  lines: metric(l),
});

const SUMMARY = {
  total: entry(97.5, 95.25, 99, 98),
  '/repo/source/src/lib/geo.ts': entry(100, 100, 100, 100),
  '/repo/source/src/app/files.tsx': entry(98.38, 92.85, 100, 100),
  '/repo/source/src/app/bad.tsx': entry(95, 85, 100, 96),
};

describe('toMarkdown', () => {
  const md = toMarkdown(SUMMARY, { rootDir: '/repo/source', threshold: 90, title: 'Test coverage' });

  it('starts with a hidden marker so a PR comment can be found and updated', () => {
    expect(md.startsWith(`${MARKER}\n`)).toBe(true);
  });

  it('shows the totals', () => {
    expect(md).toContain('## Test coverage');
    expect(md).toContain('| **All files** | 97.5% | 95.25% | 99% | 98% |');
  });

  it('lists every file relative to the root, sorted, marking files below the threshold', () => {
    const rows = md.split('\n').filter((l) => l.startsWith('| ✅') || l.startsWith('| ❌'));
    expect(rows).toEqual([
      '| ❌ | `src/app/bad.tsx` | 95% | **85%** | 100% | 96% |',
      '| ✅ | `src/app/files.tsx` | 98.38% | 92.85% | 100% | 100% |',
      '| ✅ | `src/lib/geo.ts` | 100% | 100% | 100% | 100% |',
    ]);
  });

  it('summarises how many files meet the threshold', () => {
    expect(md).toContain('2 of 3 files meet the 90% minimum (statements, branches, functions, lines).');
  });

  it('collapses the per-file table and says when everything passes', () => {
    const ok = toMarkdown({ total: entry(100, 100, 100, 100), '/r/a.ts': entry(100, 100, 100, 100) }, { rootDir: '/r' });
    expect(ok).toContain('<details>');
    expect(ok).toContain('All 1 files meet the 90% minimum');
    expect(ok).toContain('## Coverage');
  });

  it('adds an optional footer line', () => {
    expect(toMarkdown(SUMMARY, { rootDir: '/repo/source', footer: 'Commit abc1234' })).toContain('\nCommit abc1234\n');
  });
});

describe('main (CLI)', () => {
  it('reads the summary, appends to the output file and prints the markdown', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cov-'));
    const input = path.join(dir, 'coverage-summary.json');
    const output = path.join(dir, 'summary.md');
    fs.writeFileSync(input, JSON.stringify(SUMMARY));
    fs.writeFileSync(output, 'existing\n');
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});

    main(['node', 'coverage-report.js', input, '--root', '/repo/source', '--append', output, '--footer', 'Run 1']);

    const written = fs.readFileSync(output, 'utf8');
    expect(written.startsWith('existing\n')).toBe(true);
    expect(written).toContain('`src/app/bad.tsx`');
    expect(written).toContain('Run 1');
    expect(log).toHaveBeenCalledWith(expect.stringContaining(MARKER));
    log.mockRestore();
  });

  it('prints only, with defaults, when no options are given', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cov-'));
    const input = path.join(dir, 'coverage-summary.json');
    fs.writeFileSync(input, JSON.stringify(SUMMARY));
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    main(['node', 'coverage-report.js', input]);
    expect(log.mock.calls[0][0]).toContain('/repo/source/src/lib/geo.ts');
    log.mockRestore();
  });

  it('fails clearly without an input file', () => {
    expect(() => main(['node', 'coverage-report.js'])).toThrow('Usage: coverage-report.js');
  });
});
