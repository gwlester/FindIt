#!/usr/bin/env node
// Turns Jest's coverage/coverage-summary.json into a Markdown report for the GitHub
// Actions run summary and the pull request coverage comment.
//
//   node scripts/coverage-report.js coverage/coverage-summary.json \
//     [--root <dir>] [--threshold 90] [--title "Test coverage"] [--footer "..."] [--append <file>]

const fs = require('node:fs');
const path = require('node:path');

/** Hidden first line, used to find (and update) the coverage comment on a pull request. */
const MARKER = '<!-- findit-coverage -->';
const METRICS = ['statements', 'branches', 'functions', 'lines'];

/**
 * @param {Record<string, Record<string, { pct: number }>>} summary
 * @param {{ rootDir?: string, threshold?: number, title?: string, footer?: string }} [options]
 * @returns {string}
 */
function toMarkdown(summary, { rootDir = '', threshold = 90, title = 'Coverage', footer = '' } = {}) {
  const files = Object.keys(summary)
    .filter((file) => file !== 'total')
    .map((file) => ({ name: rootDir ? path.relative(rootDir, file) : file, data: summary[file] }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const passes = (data) => METRICS.every((m) => data[m].pct >= threshold);
  const passing = files.filter((f) => passes(f.data)).length;
  const cell = (data, m) => (data[m].pct < threshold ? `**${data[m].pct}%**` : `${data[m].pct}%`);

  const lines = [
    MARKER,
    `## ${title}`,
    '',
    '| | Statements | Branches | Functions | Lines |',
    '| --- | --- | --- | --- | --- |',
    `| **All files** | ${METRICS.map((m) => `${summary.total[m].pct}%`).join(' | ')} |`,
    '',
    passing === files.length
      ? `All ${files.length} files meet the ${threshold}% minimum (statements, branches, functions, lines).`
      : `${passing} of ${files.length} files meet the ${threshold}% minimum (statements, branches, functions, lines).`,
    '',
    '<details><summary>Coverage by file</summary>',
    '',
    '| | File | Statements | Branches | Functions | Lines |',
    '| --- | --- | --- | --- | --- | --- |',
    ...files.map(
      (f) => `| ${passes(f.data) ? '✅' : '❌'} | \`${f.name}\` | ${METRICS.map((m) => cell(f.data, m)).join(' | ')} |`,
    ),
    '',
    '</details>',
  ];
  if (footer) lines.push('', footer);
  return lines.join('\n') + '\n';
}

/** @param {string[]} argv process.argv */
function main(argv) {
  const args = argv.slice(2);
  const input = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
  if (!input) throw new Error('Usage: coverage-report.js <coverage-summary.json> [--root dir] [--append file]');
  const option = (name) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const markdown = toMarkdown(JSON.parse(fs.readFileSync(input, 'utf8')), {
    rootDir: option('root'),
    threshold: option('threshold') ? Number(option('threshold')) : undefined,
    title: option('title'),
    footer: option('footer'),
  });
  const append = option('append');
  if (append) fs.appendFileSync(append, markdown);
  console.log(markdown);
}

/* istanbul ignore next -- only runs when executed directly */
if (require.main === module) main(process.argv);

module.exports = { MARKER, main, toMarkdown };
