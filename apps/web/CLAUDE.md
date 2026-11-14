# CLAUDE.md — apps/web

Web app rules: sections 5.4, 5.5, 5.9, 5.10, 6.5 and 11.12 of the root CLAUDE.md. Tests follow
[docs/testing/frontend.md](../../docs/testing/frontend.md).

## 5.4 Frontend: FSD

- FSD layers live inside `apps/web`. `packages/` holds only what several applications use.
- Steiger checks FSD compliance in CI.
- Code is split by routes. PixiJS is loaded by dynamic `import()` and only on pages that need it. The size-limit
  budget of the main bundle excludes Pixi.
- The API client is a thin wrapper over `fetch`: it parses Problem Details into a typed error by `code` and integrates
  with TanStack Query.

## 5.5 Rendering and publishing

- Public pages are prerendered at build time (`prerender` with `crawlLinks`); the SPA shell serves other routes.
- Target output: a static directory behind Caddy with `try_files` to the shell. A prototype in iteration 3 must prove
  it: in SPA mode the server build may still contain SSR code. If it fails, web runs as a separate container.
- HTML is prerendered anonymously. The session is requested after hydration (`/api/v1/me`); protected routes use
  `ssr: false`. User data never gets into the prerender.
- Case pages are updated by a regular commit and deploy. No CDN.
- **Publication pages — the decision is deferred to iteration 10**; the base infrastructure does not account for them.
  In iteration 10 review the options with Sergei and explain the mechanics of each:
  - client-side pages with `noindex` without rebuilding. This is the preliminary recommendation: users create
    publications, rebuilding on their actions is an abuse vector, and indexable user content attracts SEO spam;
  - debounced rebuild (pg-boss job → `workflow_dispatch`) — if indexable publications are needed.
- TanStack Start server functions are not used for business logic — all business logic is in NestJS.

## 5.9 i18n

- UI strings are stored in Paraglide JS catalogs.
- Case page texts live in code, separately per locale. Long text is easier to keep in typed content modules
  (`content.ru.ts`, `content.en.ts`) than in message catalogs. The format is chosen in iteration 3.
- Translation tables in the DB (a `locale` field, fallback to the default locale) are needed only if publications
  become bilingual. Decided in iteration 10.
- The locale is set by a URL prefix (`/ru/`, `/en/`). `Accept-Language` is used only for the redirect from the root.
  The user's choice is remembered in a cookie.
- The API returns error codes; the frontend renders texts. Email templates exist for both locales.

## 5.10 SEO and Web Vitals

- SEO:
  - route `head()`: title, description, canonical, OG/Twitter;
  - `hreflang` with `x-default`;
  - `sitemap.xml` for both locales, built at build time from the route tree; whether to include publication pages is
    decided in iteration 10;
  - `robots.txt`;
  - JSON-LD: `Person`, `CreativeWork`;
  - semantic markup and correct HTTP statuses.
- Web Vitals (LCP, INP, CLS):
  - Lighthouse CI with budgets in GitHub Actions;
  - size-limit for bundles;
  - real-user metrics are collected via `web-vitals` into the metrics module (iteration 5) with data minimization
    (section 5.13).
- Techniques:
  - fonts are self-hosted, Latin and Cyrillic only, with preload and tuned fallback font metrics;
  - image variants (AVIF/WebP, several widths): for cases — at frontend build time (open question in section 9), for
    uploaded files — on the backend;
  - `srcset`/`sizes`, explicit dimensions and `fetchpriority="high"` for the LCP image;
  - heavy computations run in Web Workers.

## 6.5 Accessibility

- Complex widgets (dialogs, menus, selects, tabs, tooltips) are built on headless primitives; simple elements — on
  native HTML.
- Keyboard navigation, visible focus, ARIA attributes and respect for `prefers-reduced-motion` are mandatory.
- Decorative animation is enabled only without `prefers-reduced-motion`; one function performs the check.
- Flashing (WCAG 2.3.1): series of at most three flashes, pauses between series longer than one second.

## 11.12 Web app conventions

Transferred on 2026-11-08 from Sergei's projects pixi-demos and mimictears, confirmed by Sergei on 2026-11-14.

### React

- Function components; Tailwind in `className`. No CSS modules or styled-components; one global stylesheet.
- Components are arrow functions `export const` without `React.FC`; props are an `interface XxxProps` next to the
  component.
- Brand colors are Tailwind `@theme` tokens; the tokens and their TS counterpart for PixiJS code live in `packages/ui`.
- Third-party CSS is included via `@import … layer(components)`: CSS outside a layer overrides Tailwind utilities at
  any specificity.
- React Compiler memoizes components and hooks; `useMemo`, `useCallback` and `memo` are not written by hand. The
  compiler runs through Babel (`vite.config.ts`); the `react-hooks` lint rules report code that breaks the Rules of
  React, and the compiler skips such code.
- A route file is a chunk boundary: TanStack Start always enables `autoCodeSplitting`, so routes need no `lazy`.

### Network

- The API client returns a plain promise and throws a typed error (Problem Details `code`, section 5.4). Request state
  lives in TanStack Query; there are no wrappers around requests.
- The base URL comes from `env.VITE_API_URL` of `src/config.ts`.
- Requests accept an `AbortSignal`; a query function passes the `signal` of TanStack Query.

WebSocket (iteration 8):

- An incoming WS message is parsed with `safeParse`; an invalid message is ignored, a server error rejects the request
  at once.
- A shared helper builds the WS message envelope. A facade returns `result`; only the facade depends on the envelope
  format.
- The owner of a push subscription sets it up through the transport and removes it when the owner is destroyed.

### Client errors

- Two categories: a recoverable error — the app keeps working, the dev build logs it to the console; a fatal error — the
  app shows a screen with a reload button.
- `AbortError` is a cancellation; it is filtered out at the entry point.
- No empty `catch`: where there is nothing to show, call a trace function.
- Global handlers (`error`, `unhandledrejection`) are installed once at startup.
- There is one error bus.
- A request error is not fatal: the caller rolls back its changes and reports a recoverable error.
- Reference implementation from pixi-demos: the error bus is a window event (`app:notice`) typed through a
  `WindowEventMap` augmentation. The errors module is a leaf of the import graph: in pixi-demos an emitter or DI in it
  would add PixiJS to the initial bundle. Handlers in this app: the global ones, the `hydrateRoot` callbacks
  (`onCaughtError`, `onUncaughtError`, `onRecoverableError`) in the client entry, the router `defaultErrorComponent`.

### Mocks

- MSW in the browser (`setupWorker`) is removed from the production bundle only by folding the flag into a literal
  inside the entry module. After an edit of the entry module, check that
  `pnpm build && grep -rl setupWorker apps/web/dist/client/assets/` prints nothing. The entry module is chosen when
  browser MSW is added. Scenario tests use `msw/node`, which does not enter the bundle.

### Client storage

Tokens are never stored on the client (section 5.7); Web Vitals are sent without storage (section 5.13). These rules
apply to user preferences and drafts.

- Flags and short values go to `localStorage`, structures to IndexedDB. Reads return `unknown`; the application
  validates the value with a type guard or a Zod schema.
- Unavailable storage is not a failure: a read returns `undefined`, a write is skipped, only a trace is emitted.
- `navigator.storage.persist()` asks the browser to keep the site storage; storage that is already persistent is not
  requested again, because Firefox shows a permission prompt. Safari deletes the script-writable storage of a site
  after 7 days of browser use without user interaction on the site.
- A stored record carries a `version` field. Migration code and its test appear with the first format change.
- A value created before the saved one is loaded is not written on creation: an empty value would overwrite the saved
  one.
- A persistent entity id (slug) never changes: user data is stored by it.

### Browser specifics

- Path case is checked against the disk: APFS is case-insensitive, so a typo shows up only on case-sensitive serving
  (Linux, CI, Caddy) as a 404.
- Files loaded by a string URL at runtime live in `public/`: they have no ESM import and are not part of the Vite
  build graph. The `/assets/` path is used by the Vite bundle.
- Build variables have the `VITE_` prefix and live in `.env` (keys with comments in `.env.example`); `src/config.ts`
  validates them with Zod on load, and code imports `env`.
- iPhone check: a production build served in the local network. WebKit blocks port 4190 (ManageSieve), and Safari
  opens `about:blank`. A site served over HTTP in the local network is not a secure context.

### Review materials

- Screenshots and variant sheets go into the workspace, into a `*.local` folder ignored by git (for example
  `review.local/` at the root). Links are markdown with relative paths so Sergei opens them with a click in VS Code;
  scratchpad paths (`/private/tmp/...`) do not open from the editor.
- Each variant is shown as a full-screen snapshot with a captioned sheet; a fragment does not replace the full view.
- No video: Sergei watches motion in the dev server.
- Snapshots come from a temporary Playwright script: 1920×1080 at DPR 1, 1440×900 at DPR 2, 390×844 at DPR 3; variants
  are switched with `page.route` without a rebuild.
- The review folder is deleted after the task is accepted.
