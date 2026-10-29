# FindCache: working agreement

The app lives in `source/` (Expo / React Native, Android only); see `source/AGENTS.md` for
Expo-specific rules, `docs/` for architecture, and `prompts/ToDo.md` / `prompts/Done.md` for
open and finished work.

## Test-driven development (required)

Develop every change test-first:

1. **Red:** write or extend a test in `source/__tests__/` (mirroring `src/`) that describes
   the new behaviour or reproduces the bug. Run it and confirm it fails for the expected reason.
2. **Green:** write the minimum code to make it pass.
3. **Refactor:** clean up with the tests passing.

Applies to bug fixes too: first a test that reproduces the bug.

- Run a single test file while iterating: `cd source && npm test -- __tests__/path/to.test.ts`.
- Before finishing: `npm run typecheck`, `npm run lint` and `npm run test:coverage` must pass.
  Coverage must stay **≥90% statements, branches, functions and lines for every file**; CI
  enforces this.
- Use the existing helpers in `source/__tests__/helpers/` (real in-memory SQLite, GPS/compass,
  native module, BLE and router mocks; `renderApp`, `mockAlert`). Prefer React Native Testing
  Library queries by role/text and `userEvent`. RNTL 14 APIs are async (`await render`, `await act`).
- The Kotlin module (`source/modules/findit-native/android`) is outside the Jest suite; describe
  how a Kotlin change was verified (CI build, device test) in the PR.

## Also

- CI (`.github/workflows/build-android.yml`) runs on pull requests and on pushes to `master`,
  not on plain branch pushes: open a PR to get a build. `build` is a required check for merging.
- Keep `docs/` (including wireframes via `docs/wireframes/generate_wireframes.py`) and
  `prompts/Done.md` / `prompts/ToDo.md` up to date with each change.
- A successful `master` build that changes the app (`source/` or the build workflow) is
  published as a date-versioned release (`YYYY.MM.DD.NNN`); docs-only merges are not
  released. Only the two newest releases are kept.
