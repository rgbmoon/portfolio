# Web app conventions

Rules transferred from Sergei's projects pixi-demos and mimictears for `apps/web`. They are confirmed with Sergei and
moved into `apps/web/CLAUDE.md` in iteration 3, together with his frontend testing strategy. General rules are in the
root `CLAUDE.md` (section 11).

## React

- Function components; Tailwind in `className`. No CSS modules or styled-components; one global stylesheet.
- Components are arrow functions `export const` without `React.FC`; props are an `interface XxxProps` next to the
  component.
- A component folder is a module: a `PascalCase` folder with `index.tsx`, imported by the folder.
- Brand colors are Tailwind `@theme` tokens; their TS counterpart for PixiJS lives in a shared package.
- Third-party CSS is included via `@import … layer(components)`: CSS outside a layer overrides Tailwind utilities at
  any specificity.
- No manual memoization without need. Whether React Compiler is enabled is decided in iteration 3.
- Pages are a lazy chunk boundary. PixiJS in shared components is loaded by dynamic `import()` so it stays out of the
  initial bundle.

## Network

- The API client returns a plain promise and throws a typed error (Problem Details `code`, section 5.4). Request state
  lives in TanStack Query; there are no wrappers around requests.
- The base URL comes from configuration; it is not hard-coded in a client class.
- Requests accept an `AbortSignal`.
- An incoming WS message is parsed with `safeParse`; an invalid message is ignored, a server error rejects the request
  at once.
- A shared helper builds the WS message envelope. A facade returns `result`; only the facade depends on the envelope
  format.
- The owner of a push subscription sets it up through the transport and removes it when the owner is destroyed.

## Client errors

- Two categories: a recoverable error — the app keeps working, the dev build logs it to the console; a fatal error — the
  app shows a screen with a reload button.
- `AbortError` is a cancellation; it is filtered out at the entry point.
- No empty `catch`: where there is nothing to show, call a trace function.
- Global handlers (`error`, `unhandledrejection`) are installed once at startup.
- There is one error bus; notifications are not added to the event map.
- A request error is not fatal: the caller rolls back its changes and reports a recoverable error.
- Implementation in pixi-demos: the error bus is a window event (`app:notice`) typed through a `WindowEventMap`
  augmentation. The errors module is a leaf of the import graph: an emitter or DI in it would add PixiJS to the initial
  bundle. Handlers: global ones, `createRoot` callbacks, the router error boundary.

## Mocks

- MSW is removed from the production bundle only by folding the flag into a literal inside the entry module. After an
  edit of the entry module, check that `pnpm build && grep -rl setupWorker dist/assets/` prints nothing. The entry
  module of TanStack Start is chosen in iteration 3.

## Client storage

Tokens are never stored on the client (CLAUDE.md section 5.7); Web Vitals are sent without storage (section 5.13).
These rules apply to user preferences and drafts.

- Flags and short values go to `localStorage`, structures to IndexedDB. Reads return `unknown`; the application
  validates the value with a type guard or a Zod schema.
- Unavailable storage is not a failure: a read returns `undefined`, a write is skipped, only a trace is emitted.
- `navigator.storage.persist()` asks the browser to keep the site storage; storage that is already persistent is not
  requested again, because Firefox shows a permission prompt. Safari deletes site storage after 7 days without a visit.
- A stored record carries a `version` field. Migration code and its test appear with the first format change.
- A value created before the saved one is loaded is not written on creation: an empty value would overwrite the saved
  one.
- A persistent entity id (slug) never changes: user data is stored by it.

## Browser specifics

- Path case is checked against the disk: APFS is case-insensitive, so a typo shows up only on case-sensitive serving
  (Linux, CI, Caddy) as a 404.
- Files loaded by a string URL at runtime live in `public/`: they have no ESM import and are not part of the Vite
  build graph. The `/assets/` path is used by the Vite bundle.
- Build flags live in `.env`; Vite passes them to `import.meta.env` through `envPrefix`; code reads a flag once into a
  constant.
- iPhone check: a production build in the local network via `vite preview --host 0.0.0.0 --port 5180`. WebKit blocks
  port 4190 (ManageSieve), and Safari opens `about:blank`. A site served over HTTP in the local network is not a secure
  context.

## Accessibility

- Decorative animation is enabled only without `prefers-reduced-motion`; one function performs the check.
- Flashing (WCAG 2.3.1): series of at most three flashes, pauses between series longer than one second.

## E2E tests

- Automated e2e tests run through the Playwright runner on a production build.
- Elements are located by role (`getByRole`); waits target an element, wait timeouts are not used.

## Review materials

- Screenshots and variant sheets go into the workspace, into a `*.local` folder ignored by git (for example
  `review.local/` at the root). Links are markdown with relative paths so Sergei opens them with a click in VS Code;
  scratchpad paths (`/private/tmp/...`) do not open from the editor.
- Each variant is shown as a full-screen snapshot with a captioned sheet; a fragment does not replace the full view.
- No video: Sergei watches motion in the dev server.
- Snapshots come from a temporary Playwright script: 1920×1080 at DPR 1, 1440×900 at DPR 2, 390×844 at DPR 3; variants
  are switched with `page.route` without a rebuild.
- The review folder is deleted after the task is accepted.
