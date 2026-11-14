# Frontend testing strategy

Applies to `apps/web` and the frontend packages (`packages/ui`, `packages/pixi-charts`). Adapted on 2026-11-14 from
Sergei's strategy in pixi-demos (`docs/testing.html`). The general principles — test selection, the unit of testing,
doubles, determinism, file layout, CI load — are in [.claude/rules/tests.md](../../.claude/rules/tests.md) (CLAUDE.md
section 11.10); this document does not repeat them.

## Shape

A test is written only for a statement that the type system cannot express: a relation between values, an invariant, a
state transition, error handling, a user scenario. Where a type or a lint rule can catch a defect, the static check is
strengthened, and no test is added.

The result differs from the classic pyramid: a wide static base, a narrow unit layer, a wide scenario layer and a thin
e2e top. The width of a layer is the number of tests in it; the number of code layers does not affect it.

```
              e2e                      can the user complete the scenario
  ──────────────────────────────────
     scenarios — the main layer        client flows over a mocked server
  ──────────────────────────────────
      unit tests — a narrow layer      only what a type cannot express
  ══════════════════════════════════
      types + lint — all code          the base; these are not tests
```

## Layers

| Layer | Run by | Environment | Checks | Starts with |
|---|---|---|---|---|
| Static | `pnpm lint`, `pnpm typecheck` | — | all code: strict TS, package and FSD boundaries, React Compiler rules of `eslint-plugin-react-hooks`, Zod at the network boundary | iteration 0 |
| Unit | `pnpm test` | node | rules a type cannot express, in `model` and `lib` segments and in packages | the first such rule |
| Scenarios | `pnpm test` | node, `msw/node`; jsdom only in a file that declares it | client flows through real modules over a mocked server | the API client (iteration 1) |
| Build output | Vitest over `dist/`, size-limit, Lighthouse CI | node | properties of the static output | iteration 3 |
| E2E | `pnpm test:e2e` | Playwright, Chromium | the static output behind Caddy in a browser | iteration 3 |

Until the API client and forms appear, the app has almost no client logic, and most checks are e2e and build output
checks.

### Unit tests

They check statements that are not available to a type. Some of these statements no other layer checks: e2e runs one
path through a page, and a scenario runs one server response per request. For other statements a unit test shortens the
search for the cause: a failure points to one module, without analysis of the browser, the network and React.

Examples: every route has a page in both locales, and their `hreflang` links point to each other; the locale from the
cookie takes precedence over `Accept-Language`; a stored record with an unknown `version` is not applied.

### Scenarios

They run the same module graph as production: the real API client, the TanStack Query client and the schemas of
`packages/contracts` over an MSW server. Doubles replace only the network (MSW handlers) and the browser APIs that node
lacks.

They detect defects that static checks and unit tests do not detect: a wrong call order, a lost rollback on an error
branch, a mismatch between a mock and a schema, a cache entry left stale after a mutation, a subscription leak.

A scenario is stated in product terms: "the server rejected the publication — the draft is kept, the user sees the
error, the form is enabled again". Handlers are created by factories that close over their own state, so state does not
pass from one test to the next. A scenario ends with a check that the error bus is empty: an error on a branch that the
test does not check explicitly fails it.

### Build output

The web app is a static directory (section 5.5), so part of its correctness is in the files: which pages are
prerendered, what the client bundle contains, which image variants exist. These checks read `dist/` after the build and
need no browser. Examples: the client output contains no SSR server code; a build without `VITE_API_URL` fails;
`sitemap.xml` lists every prerendered page in both locales; every case image has all formats and widths. The size-limit
budget of the main bundle and the Lighthouse CI budgets belong to this layer.

### E2E

They answer one question: can the user complete the scenario in a real browser. They run on the production build: the
static output behind Caddy, as in production, calling the api.

- Elements are located by role (`getByRole`).
- A test waits for an element to appear or disappear; wait timeouts are not used.
- Timings and animations are checked in lower layers: the run is slow, and checks of time and animation make a test fail
  intermittently without code changes.

## What is not covered and why

**React components in isolation.** Pages, layouts and UI components are checked through e2e, where they run with the
real router, hydration and the real error bus. A component test states "with props X the element shows Y": this is the
JSX written a second time, without a relation between values that a type cannot express. Separate jsdom tests with
Testing Library would repeat the e2e checks and add jsdom and Testing Library to the dependencies. The question is
revisited in iteration 6 together with forms.

**Rule for new code.** If a relation between values appears in a component — state, a counter, an order of steps, a
condition that changes data or the user flow — it moves into the `model` segment of the slice (a function, a store, a
query options module) and is tested there. The `ui` segment stays wiring between the model and the markup, and the
reasons above stay valid.

**Server doubles.** MSW handlers and test data factories are test tooling and do not reach the bundle. A broken handler
fails the scenario that uses it.

**Canvas code.** View components, controllers and adapters of `packages/pixi-charts` have no separate tests; the model
they read is tested ([docs/conventions/pixi.md](../conventions/pixi.md), "Model and adapter"). The result of a view
method is an image on the canvas. A check of PixiJS object fields (`alpha`, `position`, `tint`) after the call repeats
the lines of the method: it fails on any edit of the implementation and passes when the user sees a defect, such as an
element covered by another layer. jsdom has no 2d context, so a controller test would need a canvas mock or Vitest
Browser Mode.

**Screenshot regression.** Not used (decided on 2026-11-14). On DOM pages fonts and antialiasing differ between macOS
and the Linux runner, so references could be produced only in CI, and while the design changes they would be updated
more often than they would catch regressions. On the canvas WebGL output differs between GPUs and drivers. Layout errors
are checked by eye in review materials (`apps/web/CLAUDE.md`, section 11.12).

**Coverage threshold.** Not set: e2e and build output checks cover part of the code, and the coverage report does not
count them, so a project-wide percentage misleads. The report is read when needed.

## How to add a test

**Unit test.** Check first that a type cannot express the statement; if a type catches it, fix the type. Then take the
public function or method of the owning module, build it by hand without a container, and state a relation between
values; the expected result of one particular call is not such a relation. The file goes into `tests/` of its package
and is named after the subject.

A test does not check a situation that production code never reaches: before a test of a branch, find the call in
`src/` that creates it. A contract of a shared package without a consumer is tested together with its first consumer.

**Scenario.** Start the MSW server with handler factories from `tests/setup/`, create the API client and the query
client with the same functions as production code, describe the steps in product terms, and assert observable results:
data in the query cache, requests the server received, errors on the error bus. A check that depends on mock data (an
error code, an empty list) begins with a precondition on the server response: without it a change of the mock turns
the check into an empty one, and the test passes without checking anything.

**E2E spec.** Open the page by its URL in the static output, locate elements by role, and wait for elements to appear or
disappear. A spec that goes through an error path asserts the visible message and the state the page returns to.

## Commands

| Command | What it does |
|---|---|
| `pnpm test` | Vitest tests of all packages |
| `pnpm test:e2e` | e2e tests of all packages; the Turborepo task depends on `build` |
| `pnpm verify` | the full check before work is handed over: format, lint, typecheck, tests, build, e2e |
| `pnpm exec vitest run tests/<file>.test.ts` | one file, run from the package folder |

Turborepo caching and the CI order are described in `.claude/rules/tooling.md` and `.claude/rules/tests.md`.
