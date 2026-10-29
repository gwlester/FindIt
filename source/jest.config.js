/** @type {import('jest').Config} */
const PER_FILE = { branches: 90, functions: 90, lines: 90, statements: 90 };

module.exports = {
  preset: 'jest-expo',
  clearMocks: true,
  // Screen tests render whole screens and type character by character; on a busy CI runner
  // (with coverage instrumentation) the 5 s default is too tight.
  testTimeout: 30_000,
  // On GitHub Actions, failing tests are also reported as annotations on the run.
  reporters: process.env.GITHUB_ACTIONS ? ['default', 'github-actions'] : ['default'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/helpers/setup.ts'],
  testMatch: ['<rootDir>/__tests__/**/*.test.{ts,tsx}'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', 'scripts/**/*.js', 'modules/findit-native/index.ts'],
  coverageReporters: ['text', 'text-summary', 'json-summary'],
  // A glob key applies the threshold to every matching file individually.
  coverageThreshold: {
    './src/**/*.{ts,tsx}': PER_FILE,
    './scripts/**/*.js': PER_FILE,
    './modules/findit-native/index.ts': PER_FILE,
  },
};
