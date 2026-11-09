---
paths:
  - "**/tests/**"
  - "**/e2e/**"
  - "**/vitest*.config.ts"
  - "**/playwright.config.ts"
---

# Tests (CLAUDE.md section 11.10)

General principles. The backend strategy is defined in iteration 2, the frontend strategy is Sergei's (iteration 3).

**What to test:**
- A wide unit base of the classic pyramid is rejected. In TypeScript the typecheck and a strict linter cover the unit
  level: what a function accepts and returns is known without a test. A test "the function returns what the
  implementation says" duplicates the code: it comes from the same understanding and breaks together with the
  implementation.
- Static checks are used to the maximum: strict TS, module boundaries in ESLint, Zod at the network boundary. Tests do
  not duplicate them.
- A test is added when it checks a relation between values, an invariant, a state transition, error handling or a user
  scenario that the type system cannot express: a total equals the sum of items (`total === Σ item.value`), a balance
  matches after a cycle of operations, a terminal error stops further steps. If the requirement can be expressed by a
  type or a lint rule, strengthen the static check.
- Integration tests check business scenarios; wiring between classes is not their subject. Most tests live at this
  level.
- E2E tests cover critical paths on a production build: whether the user can complete the target scenario.
- The unit of testing is the public API of the owning class. Private methods are checked through public ones; they are
  not opened for tests, and internal structure is not pinned without a behavioral reason.
- The math of mocks (server doubles) is not tested. Mocks are deterministic (seeded RNG, `?scenario=`) so scenarios and
  e2e runs are reproducible.

**How to test:**
- Application modules are not replaced with `vi.mock`: doubles come through a constructor, a structural interface or DI
  (`overrideProvider` in the Nest testing module).
- A test does not depend on `Math.random` or system time. Randomness is passed as a parameter: functions accept a
  generator and are tested with a seeded one; scenario tests replace `Math.random` through `vi.spyOn`. Time comes from a
  controllable clock (`Clock`, section 5.2).
- Tests do not read the developer's `.env`; they run on an explicit test configuration. Checks "for each item of a
  catalog" iterate the full catalog of all build variants.
- No colocation: every package has `tests/`, shared setup in `tests/setup/`, e2e tests in `e2e/`. Other packages import
  the test setup of a library package by name (`@portfolio/<lib>/tests/setup/...`). Files are named after the subject
  of the check and do not repeat the source path.
- Tests run in the node environment by default; a file that needs a browser API declares `// @vitest-environment
  jsdom` on its first line.
- `globalSetup` builds heavy fixtures once per run; tests receive them through `inject`.

**CI and load:**
- CPU-heavy tests next to type-aware ESLint and `tsc` slow down several times on a runner and exceed `testTimeout`.
  Therefore in CI tests run as a separate step after lint in the same job; e2e tests run in their own step on the
  production build.
- The `actions/cache` cache is scoped by ref: a push to main sees only the cache of the previous main and reruns the
  whole PR diff at once. A failed job does not save its cache, so a re-run repeats the same load. A test that fails only
  on push to main while the PR is green points to the run load.
- On CI timeouts, first check the set of rerun tasks (`turbo --dry=json`) and the job load (what runs in parallel with
  the tests), then change the tests. Check-run annotations are available through the public API without a token.

