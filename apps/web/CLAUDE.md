# CLAUDE.md — apps/web

Web app rules: sections 5.4, 5.5, 5.9, 5.10 and 6.5 of the root CLAUDE.md. The rules in
[docs/conventions/web.md](../../docs/conventions/web.md) move here in iteration 3 after Sergei confirms them.

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
