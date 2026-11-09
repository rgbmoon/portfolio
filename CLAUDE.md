# CLAUDE.md — Portfolio platform (fullstack)

## 1. Goal and context

**Product.** Sergei's portfolio site: product case studies built with the technologies of his stack. No iGaming or game
themes. The final feature set is defined along the roadmap.

**Project goal.** Add backend and infrastructure to frontend experience and get a real fullstack case: a public
repository, a production deployment, verification under real conditions.

**Product model.**
- A case is a separate frontend page built by hand: its own route, layout and embedded demos. Case texts and images
  live in the repository. There is no shared page template and no case records in the DB.
- The backend is a set of services used by the case pages: authentication and users, moderation, Web Vitals metrics,
  files, drawing, publications, realtime gateway, email. The list is preliminary; the module map is refined in
  iteration 1.
- The DB stores service data: users, sessions, metrics, canvas state, publications.
- A case is updated by a regular commit and deploy.
- **User content:** demo publications are created by registered users; the drawing canvas and profile names are user
  content too. Protection rules — section 5.8.

**Owner.** Sergei — senior frontend developer: 5 years of commercial development with React/TypeScript, FSD
architecture, Zustand, TanStack, Vitest/MSW/Testing Library, PixiJS. Backend, Docker and operations are new areas for
him; he is learning them.

**Learning mode.** In backend and infrastructure tasks explain mechanisms along with results: what happens, why it is
done this way, which alternatives exist. Use frontend analogies where they are accurate. Record key decisions in ADRs.

## 2. Communication and language

- Chat with Sergei is in Russian: answers, plans, iteration reports. Plain engineering language without slang or
  colloquialisms. In the imperative mood the verb comes first: «Перезапусти сервер».
- Everything in the repository is in English: code comments and JSDoc, CLAUDE.md files, `docs/`, ADRs, README, commit
  messages, PR descriptions.
- User-facing strings go through the i18n catalogs `ru` and `en` (section 5.9).
- Check versions, prices and library capabilities against sources; do not answer from memory.
- Writing style rules for any text — section 11.1.

## 3. Stack (decisions made)

Versions checked on 2026-11-08.

| Area | Decision | Note |
|---|---|---|
| Runtime | Node.js 26 LTS | Built-in type stripping does not support decorators, so Nest is compiled. Corepack is not shipped since Node 25: the pnpm version is pinned in `packageManager` |
| Package manager, monorepo | pnpm 12 workspaces + Turborepo | Exact versions of key packages in the pnpm catalog. Since pnpm 11 `.npmrc` holds only auth and registry, other settings live in `pnpm-workspace.yaml`; in pnpm 12 an unknown key there fails the command |
| Language | TypeScript 6.0.3, strict mode | TS 7 is not used: typescript-eslint 8.x requires `<6.1.0`, `@nestjs/cli` depends on `~6.0.2` |
| Backend | NestJS 12 (ESM), Express adapter | Fastify is not used: its support in the Better Auth integration is in beta |
| api build | Rspack 2: own code and `@portfolio/*` in one bundle, third-party packages external | TypeScript is compiled by the built-in `swc-loader` with decorator metadata; without metadata DI breaks silently. ADR-0002 |
| Validation, contracts | Zod 4 in `packages/contracts`; `StandardSchemaValidationPipe`, `StandardSchemaSerializerInterceptor` | Standard Schema in Nest 12 |
| OpenAPI | `@nestjs/swagger` 12 + `zod-openapi` via `standardSchemaConverter` | |
| Configuration | `@nestjs/config` with env validation by a Zod schema | |
| Request context, transactions | `nestjs-cls`, `@nestjs-cls/transactional` + Prisma adapter | The adapter declares `prisma > 4 < 9`; verify with Prisma 7 in iteration 5. Fallback — own wrapper on AsyncLocalStorage with the same API |
| DB | PostgreSQL 18+ | Built-in `uuidv7()` is required |
| ORM | Prisma 7.10.1 + `@prisma/adapter-pg` 7.10.1, exact versions | The npm tag `latest` of `prisma` points to 8.0 RC: install only with an explicit version. Renovate forbids major 8 |
| Queues, cron, reliable events | pg-boss (stores jobs in PostgreSQL) | A job is enqueued in the same transaction as the data |
| Redis / Valkey | Not used at the start | Section 10 |
| Rate limiting | `@nestjs/throttler` (in-memory), Better Auth limiter (DB storage) | |
| Health | `@nestjs/terminus` | |
| Authentication | Better Auth | Schema — section 5.7. Admin plugin for bans — check in iteration 6 |
| Email | Resend (production), Mailpit (local); templates — React Email or MJML | |
| Files | Cloudflare R2 via the S3 API (`@aws-sdk/client-s3`) | Section 5.11 |
| Image processing | sharp; type check — `file-type` | |
| HTTP API | REST | Section 5.6 |
| Realtime | `@nestjs/websockets` + `@nestjs/platform-ws` (ws), client — partysocket | Section 5.6 |
| Logs, observability | Pino (`nestjs-pino`), OpenTelemetry, Sentry (free plan), external uptime monitoring | |
| Frontend framework | TanStack Start 1.x (Vite 8) | Versions are pinned |
| Routing, data, state | TanStack Router, TanStack Query, Zustand | |
| Styles | Tailwind | |
| Accessible primitives | Base UI, package `@base-ui/react` (recommendation) | Confirmed in iteration 3. The old package `@base-ui-components/react` stopped at 1.0.0-rc.0 |
| i18n | Paraglide JS, locales `ru` and `en` | |
| WebGL | PixiJS v8 | Own package `packages/pixi-charts` |
| Backend tests | Vitest, Testcontainers (PostgreSQL 18), supertest | Strategy — iteration 2 |
| Frontend tests | Sergei's strategy | Sergei provides it in iteration 3 |
| Migration and API control | squawk, `prisma migrate diff`, oasdiff | |
| Infrastructure | Docker, Docker Compose, docker rollout, Caddy, GitHub Actions, GHCR, VPS | Kubernetes is deferred (section 10) |
| DNS, form protection | Cloudflare DNS, Cloudflare Turnstile | |

## 4. Repository structure

```
apps/
  web/            TanStack Start, FSD
  api/            NestJS, modular monolith
packages/
  contracts/      Zod schemas: REST DTOs, WS messages, events, error code registry
  ui/             design system: tokens, Tailwind theme, components
  pixi-charts/    chart rendering on PixiJS
infra/
  local/          docker compose for development
  deploy/         production compose, Caddyfile, scripts
docs/
  adr/            architecture decisions (NNNN-title.md)
  architecture/   architecture description, Mermaid diagrams
  conventions/    rules for areas that start in later iterations
  testing/        testing strategies
```

The structure is refined in iteration 0. A package appears when it is first needed; empty placeholders are not created.
Workspace packages use the scope `@portfolio/*`. Folders matching `*.local/` (working files, review materials) are
ignored by git (section 11.4). Reflect every change in this section.

Shared configs live in the root: `tsconfig.base.json` (every package `tsconfig.json` extends it), `eslint.config.ts`,
`.prettierrc.json`.

Documents with rules:

| File | Contents | Moves to |
|---|---|---|
| [docs/conventions/web.md](docs/conventions/web.md) | web app: React, client errors, client storage, browser specifics, e2e, review materials | `apps/web/CLAUDE.md` in iteration 3 |
| [docs/conventions/pixi.md](docs/conventions/pixi.md) | PixiJS: model and adapter, runtime, events, library documentation | `packages/pixi-charts/CLAUDE.md` in iteration 9 |

## 5. Architecture principles

### 5.1 Backend: modular monolith

- A module exposes only its public interface: a facade service and domain events. Importing the internals of another
  module is forbidden.
- A module does not access the tables of other modules. Modules interact through interfaces or domain events.
- In PostgreSQL each module has its own schema (Prisma `multiSchema`). There are no foreign keys between schemas of
  different modules: a module references a user only by `userId`.
- There is one Prisma client, so the architecture provides isolation: DB access goes only through the module's own
  repository; the linter forbids importing types of other modules' models.
- The linter (eslint-plugin-boundaries) checks boundaries in CI.
- The shared module contains only infrastructure and no domain logic.
- A circular dependency or `forwardRef` indicates a wrong boundary. Replace the dependency with a domain event.
- Goal: extracting a module into a separate service is a mechanical operation that requires no rewrite.

### 5.2 Cross-cutting backend infrastructure

Built in iteration 1, before the first domain module: later each item would have to be added to every module.

- **Request context** (`nestjs-cls` on AsyncLocalStorage): `requestId` (from `X-Request-Id` set by Caddy, or a new
  one), `userId`, `sessionId`, `locale`. In WS a context is created per message. In pg-boss jobs `requestId` is passed
  in the payload.
- **Logs:** `nestjs-pino` with a `mixin` from CLS — every line contains `requestId`, `userId`, `traceId`. `redact` for
  `authorization`, `cookie`, `password`, `token`. API responses carry the `X-Request-Id` header.
- **Errors:**
  - base domain error class: `code` (a stable string like `auth.email_not_verified`), `httpStatus`, `detail`, `meta`;
  - the code registry is a Zod enum in `packages/contracts`; the frontend translates errors by code;
  - one global filter converts everything to Problem Details (RFC 9457) with the extensions `code`, `requestId`,
    `errors[]`;
  - an unknown exception produces `500` without details in the response; details go to the log and Sentry;
  - the WS error envelope uses the same code registry.
- **Configuration:** one Zod env schema; the app fails at startup with an invalid configuration; `ConfigService` is
  typed. The linter forbids `process.env` outside the config module.
- **IDs:** UUIDv7 (`uuidv7()` in PostgreSQL 18). Public publication URLs use a `slug`. UUIDv7 reveals the creation
  time; if that is sensitive, a separate opaque public identifier is used. Decision — ADR in iteration 1.
- **Time:** only `timestamptz` (UTC) in the DB, Temporal in the domain, conversion at the repository boundary and in Zod
  codecs. The current time comes from an injectable `Clock`.
- **Repositories:** a thin repository per module (no generic repository) returns domain types; Prisma types stay
  inside the repository. Prisma entities are never returned in API responses.
- **Transactions:** via CLS (`@nestjs-cls/transactional`); `tx` is not passed manually down the call chain.
- **DI:** all providers are singletons. Request-scoped providers are not used — context comes from CLS.
- **Optimistic locking:** editable entities have a `version` column. A conflict returns `409` with the code
  `common.version_conflict`; in HTTP — `ETag` / `If-Match`.
- **Idempotency:** `Idempotency-Key` for POST requests that cannot be safely repeated (emails, publications, uploads).
  Table `idempotency_keys` (key, user, body hash, stored response, TTL 24 hours) and an interceptor.
- **Soft delete** — only where needed (publication trash for 30 days); no universal `deletedAt` in every table.
- **Audit:** append-only table `audit_log` for important actions: sign-in, password change, account deletion,
  publication, moderation sanctions.
- **Health and shutdown:** `/health/live` and `/health/ready` (DB available), `app.enableShutdownHooks()`. On SIGTERM
  readiness returns 503, new WS connections are rejected, existing ones receive close code 1012, in-flight requests and
  jobs complete, then the DB pool and the logger close.

### 5.3 Domain events and background jobs

- **Two levels of events:**
  - in-process (`@nestjs/event-emitter` or a typed bus) — for reactions whose loss is harmless: WS push, cache
    invalidation;
  - reliable — a pg-boss job enqueued in the same transaction as the data. This is a transactional outbox without a
    separate relay process.
- Delivery is at-least-once, so handlers are idempotent. The event schema lives in `packages/contracts` with a version:
  `type: "user.registered", version: 1`.
- **pg-boss jobs:** sending emails, Web Vitals aggregation, cleanup (sessions, raw metrics, unconfirmed uploads,
  idempotency keys), canvas snapshots, user data export, cascade deletion after `user.deleted`.
- Cron runs only via pg-boss. `@nestjs/schedule` is not used: two instances run during a deploy, and cron would fire
  twice.
- Retention of completed pg-boss jobs is configured; otherwise the table grows without bound.
- Request handlers have no synchronous side effects (emails, heavy operations).

### 5.4 Frontend: FSD

- FSD layers live inside `apps/web`. `packages/` holds only what several applications use.
- Steiger checks FSD compliance in CI.
- Code is split by routes. PixiJS is loaded by dynamic `import()` and only on pages that need it. The size-limit
  budget of the main bundle excludes Pixi.
- The API client is a thin wrapper over `fetch`: it parses Problem Details into a typed error by `code` and integrates
  with TanStack Query.

### 5.5 Rendering and publishing

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

### 5.6 Transport

**REST** — for CRUD and other operations:
- Version prefix `/api/v1`, resource-oriented URLs.
- Input is validated by Zod schemas from `packages/contracts` (`StandardSchemaValidationPipe`).
- Responses are serialized by a schema (`StandardSchemaSerializerInterceptor`) — protection against OWASP API3:2023
  (Broken Object Property Level Authorization). Owner data and public data use different schemas.
- The repository checks the resource owner (`where: { id, ownerId }`). Another user's ID returns `404` (OWASP
  API1:2023, BOLA).
- Errors — Problem Details (section 5.2). The frontend translates error texts.
- OpenAPI is generated from the schemas. The frontend imports contracts directly (recommendation; confirmed in
  iteration 1); client generation from OpenAPI — only for external consumers.
- Cursor pagination.
- A guard on `Origin` / `Sec-Fetch-Site` protects mutating endpoints.
- Changes are backward compatible only (section 6.6).

**WebSocket** — for realtime:
- One endpoint `/ws`; the envelope `{ v, type, channel, id, payload }` is versioned; every incoming message is
  validated by a Zod schema from `packages/contracts`.
- Authentication at handshake by the session cookie plus an `Origin` check on upgrade (protection against cross-site
  WebSocket hijacking).
- Limits: `maxPayload` 64 KB (the `ws` default is 100 MiB), a token bucket per connection, the number of connections per
  user and IP, the number of subscriptions per connection.
- Backpressure: if `bufferedAmount` exceeds a threshold (for example 1 MB), the server disconnects the slow client,
  and the client then resyncs.
- Heartbeat: ping every 25–30 seconds; a connection without a pong is terminated.
- The client reconnects with exponential backoff and jitter (partysocket); after reconnecting it resubscribes and
  catches up by the last `seq`.
- On process shutdown — close code 1012 (service restart).
- A `PubSub` abstraction with an in-memory implementation. Redis — when a second permanent instance is needed.
- Caddy: `stream_close_delay` (5m) and `stream_timeout` (24h); otherwise a config reload drops connections.

### 5.7 Authentication

- Better Auth runs inside the app; data is stored in our DB.
- Sign-in methods: email and password with email verification, Google (OAuth 2.0 / OIDC with PKCE), passkeys. Magic
  link or one-time code and TOTP 2FA — decided in iteration 6.
- The primary session record is in the DB. This gives instant revocation and a device list. `secondaryStorage` (Redis)
  can be added later without schema changes.
- Cookie cache with the `jwt` strategy: a short-lived (about 5 minutes) signed JWT in an httpOnly cookie, verified
  without a DB call. The 5-minute window is recorded in an ADR.
- Sensitive operations (password and email change, account deletion, passkey management, moderation actions) check
  the session in the DB, bypassing the cache.
- JWT plugin with JWKS (`sessionCookieCache: true`) — for WebSocket and future services. Set explicitly:
  `jwks.rotationInterval` (for example 30 days), `gracePeriod` (no shorter than the token lifetime plus the JWKS
  cache), `issuer`, `audience` and a short `expirationTime`. Without `rotationInterval` some versions created a key on
  every request.
- Tokens are never stored in localStorage and are not accessible to JavaScript.
- Frontend and API run on subdomains of one domain. Cookies: `Secure`, `HttpOnly`, `SameSite=Lax`. `SameSite=Lax` does
  not protect against requests from sibling subdomains, so active user content is never served from subdomains
  (section 5.11).
- `trustedOrigins` — an exact list without wildcards.
- Better Auth rate limit: `storage: "database"` and `customRules` for `/sign-in/email`, `/sign-up/email`,
  `/forget-password`, `/send-verification-email`. The real client IP comes via `advanced.ipAddress` with one trusted
  header (section 6.7).
- Protection against brute force and enumeration: the same response for "no such user" and "wrong password",
  Turnstile on sign-up and password reset, lockout per account in addition to per IP.
- Linking a Google account to an email account requires a verified email on both; otherwise account takeover is
  possible.
- Passkeys are bound to the `rpID`: the domain is fixed before launch; changing the domain invalidates them.
- Nest integration: `@thallesp/nestjs-better-auth` requires `bodyParser: false`, so the `json`/`urlencoded` limits and
  `rawBody` are set in `AuthModule.forRoot({ bodyParser })`. The global `AuthGuard` stays enabled: deny by default,
  public routes are marked explicitly. Alternative — an own guard; decided in iteration 6.
- Account deletion — `deleteUser` with re-authentication and a cascade via the `user.deleted` event. Data export — a
  JSON archive produced by a pg-boss job.

### 5.8 User content and moderation

Publications, the drawing canvas, profile names and reports are user-generated content (UGC). All UGC modules use the
shared moderation module (`moderation`) through its public interface. The numbers below are starting values, refined in
iterations 6 and 10.

**Moderation module:**
- Stores the user status (`active`, `restricted`, `banned`), trust level, reports, sanctions and violation signals.
- Provides `PolicyService`: a single check "may the user create or modify a resource" — status, trust level, personal
  quotas, global ceilings.
- Publishes the events `user.restricted`, `user.banned`, `user.unbanned`; UGC modules hide or restore content on them.

**Write permission:**
- Only an authenticated user with a verified email.
- Turnstile on publication creation.

**Trust levels** (modeled on Discourse):
- `0` — new (account younger than 24 hours): minimal quotas, no links and no image uploads.
- `1` — basic (after 24 hours without violations): standard quotas.
- `2` — trusted (assigned by the administrator): extended quotas.

**Quotas** (starting values):
- active publications per user — 5;
- blocks per publication — 50, text — 20,000 characters, images — 10;
- files per user — 25 MB, one image — 5 MB;
- reports from one user — 10 per day.

**Global ceilings:**
- the total number of publications and the total storage volume (below the free 10 GB of R2);
- when a ceiling is reached, a circuit breaker disables creation and the administrator receives a notification.

**Content:**
- A publication is stored as structured JSON blocks validated by Zod. Raw HTML is neither accepted nor rendered.
- Links — only `http`/`https`, rendered with `rel="ugc nofollow noopener"`.
- UGC pages are served with `noindex` by default. The final decision is made together with publication rendering in
  iteration 10.
- Images — only through our own upload pipeline (section 5.11). External image URLs are rejected: this protects
  against SSRF and tracking pixels.
- Repeated identical content (hash) and matches against the word and domain stop lists are blocked on save.
- Profile names: validation, reserved names, stop list.

**Reports and hiding:**
- A "Report" button for authenticated users.
- After N reports from different users (for example 3) the content is hidden automatically until an administrator
  reviews it.
- Moderation mode — post-moderation. Pre-moderation for trust level 0 can be enabled by a setting.

**Automatic sanctions:**
- Violation signals (repeated 429s, stop-list hits, confirmed reports, Turnstile failures) accumulate in a signals
  table.
- Exceeding a threshold within a window results in a temporary write restriction (for example 1 hour). A repeat
  escalates.

**Administrator sanctions:** warning → write restriction for a period → ban for a period → permanent ban.
- A ban revokes all sessions, blocks sign-in and hides content.
- The reason and term are recorded in `audit_log`.
- Ban via the Better Auth admin plugin (reason and term) — check in iteration 6.

**Protection against re-registration:**
- a limit on registrations per IP and subnet per day;
- a block list of disposable email domains (open list);
- Turnstile.
- Device fingerprinting is not used (privacy).

**Administrator tools:** report queue, hiding and restoring content, deleting all content of a user in one operation,
clearing the canvas, managing sanctions.

**Demo content lifetime:** automatic deletion of inactive demo publications (for example after 30 days without
changes) — decided in iteration 10.

### 5.9 i18n

- UI strings are stored in Paraglide JS catalogs.
- Case page texts live in code, separately per locale. Long text is easier to keep in typed content modules
  (`content.ru.ts`, `content.en.ts`) than in message catalogs. The format is chosen in iteration 3.
- Translation tables in the DB (a `locale` field, fallback to the default locale) are needed only if publications
  become bilingual. Decided in iteration 10.
- The locale is set by a URL prefix (`/ru/`, `/en/`). `Accept-Language` is used only for the redirect from the root.
  The user's choice is remembered in a cookie.
- The API returns error codes; the frontend renders texts. Email templates exist for both locales.

### 5.10 SEO and Web Vitals

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

### 5.11 Files

- Cloudflare R2 stores uploaded files (publication media). Case images live in the repository; R2 is not used for them.
- Access goes through the S3 API: the provider changes by configuration. Development uses a separate bucket.
- Files can be uploaded by users with a verified email and trust level 1 or higher, within quotas (section 5.8).
- Only raster images are accepted; sharp re-encodes them. SVG, HTML and other active formats are rejected. Files are
  served with the correct `Content-Type` and `X-Content-Type-Options: nosniff`.
- **Upload:**
  - presigned PUT with a signed `Content-Type` and a lifetime of minutes;
  - the server generates the object key: `{userId}/{uuidv7}`;
  - the bucket CORS policy allows the exact origin and the `PUT` method.
- **R2 limitations:** no presigned POST, so no `content-length-range` — the size is checked after upload. Presigned
  URLs do not work with a custom domain: uploads go to the R2 S3 endpoint, serving goes through a subdomain. Signing
  `Content-Length` in R2 is undocumented — do not rely on it without a test.
- **Confirmation after upload:**
  1. `HeadObject` — size check;
  2. `file-type` — magic bytes check;
  3. sharp — variants and EXIF removal, including geolocation;
  4. status "available".
- A cleanup job removes unconfirmed objects.
- In production files are served from our own subdomain (for example `assets.<domain>`). `r2.dev` — development only:
  its request rate is limited.
- The server does not download files by a user-supplied URL. If this becomes necessary: allowlist, deny private IPs
  after DNS resolution, timeouts, size limit.

### 5.12 Email

- Sending goes through an `EmailProvider` interface: locally to Mailpit, in production to Resend.
- Emails are sent only by a pg-boss job, never synchronously in a request handler.
- Templates — React Email or MJML, localized `ru`/`en`.
- Table `email_log` (without the email body).
- Resend free plan: 3,000 emails per month, 100 per day; at the limit sending stops. A per-user quota and a global
  circuit breaker below the provider limit are required.

### 5.13 Privacy and legal requirements

This is an engineering interpretation of GDPR and ePrivacy, not legal advice.

- **A cookie banner is not needed if:**
  - session cookies are set only after sign-in (strictly necessary);
  - Web Vitals are sent without cookies, localStorage or device identifiers.
- **Metrics:**
  - IP is used only for rate limiting with a short TTL and is not stored with metrics;
  - the user agent is coarsened;
  - raw events are kept for 30–90 days, aggregates longer;
  - the legal basis is legitimate interest (Art. 6(1)(f) GDPR), stated in the policy.
- **Documents:** a privacy policy and terms of use in `ru`/`en` — before configuring the Google OAuth consent screen.
  They include a contact for data subject requests and the list of subprocessors (Cloudflare, Resend, Sentry, Google,
  hosting).
- Sentry has personal data filtering enabled.
- User rights: self-service account deletion with a cascade and data export (section 5.7).

## 6. Mandatory rules

### 6.1 Security (the repository is public)

- Secrets live only in environment variables and GitHub Environments. The repository contains `.env.example` without
  values. Docker images contain no secrets.
- gitleaks in pre-commit and CI, secret scanning and push protection in GitHub.
- **Supply chain (OWASP A03:2025):**
  - `minimumReleaseAge` in pnpm — 3 days;
  - `--frozen-lockfile` in CI;
  - Renovate with an update delay of 7 days;
  - `pnpm audit`;
  - GitHub Actions pinned by SHA with minimal `permissions`.
- All input is validated at the boundary: REST, WS, environment configuration.
- Raw SQL — parameterized only.
- Logs contain no personal data or tokens (`redact` in Pino).
- Headers: Helmet for the API (`nosniff`, `frame-ancestors`); CSP and HSTS for static files — in Caddy.
- CORS with `credentials: true` — only for the exact origin of the web app.
- Request body limit — 100 KB for JSON by default, separate limits on specific routes.
- Every endpoint with a user resource has a test "another user's ID → 404".

### 6.2 Cost control

1. Choose services with a fixed price or a hard spending cap.
2. Route every call to a paid external service through an application quota (per user, per IP, total daily) and a
   circuit breaker that disables the feature when the ceiling is reached. Keep the total daily email limit below the
   provider limit.
3. Limit request rates: `@nestjs/throttler` (in-memory) and the Better Auth limiter (DB storage).
4. Put Cloudflare Turnstile on sign-up, sign-in, password reset, publication creation and forms that send emails.
5. Do not create public write endpoints without authentication. The only exception is anonymous telemetry collection
   (Web Vitals metrics). It requires:
   - a hard rate limit per IP;
   - a request size limit;
   - schema validation;
   - sampling;
   - no cookies or identifiers; IP is not stored;
   - aggregation and limited retention of raw data.
6. Limit the request body size, WS message size and the number of connections.
7. Apply the rules of section 5.8 to any user content: quotas, global ceilings, trust levels, sanctions.
8. Enable spending alerts on every account with a linked card. R2 has no hard spending cap, so quotas and a global
   storage ceiling are mandatory.

### 6.3 Quality

- Strict tsconfig: the flag list and per-package TypeScript settings — section 11.8.
- ESLint 10 flat config: typescript-eslint `strictTypeChecked`, eslint-plugin-boundaries, a ban on `process.env` outside
  the config module. Steiger for FSD, Prettier.
- No accessibility lint plugin: eslint-plugin-jsx-a11y declares support only up to ESLint 9, and its fork
  `eslint-plugin-jsx-a11y-x` is not used. Accessibility follows section 6.5.
- Husky and lint-staged: lint-staged runs Prettier and `eslint --fix` on staged files; typecheck runs in CI and through
  the Turborepo cache. Commit messages follow Conventional Commits; commitlint checks them.
- CI blocks the merge if lint, typecheck, tests, build, Lighthouse budgets, squawk or oasdiff fail.
- A linter rule may be disabled only with a justification comment and by agreement.
- Do not change tests to make them pass without Sergei's agreement.
- Prisma mocks are not used in tests: they check calls, not SQL. Data tests run against real PostgreSQL.

### 6.4 Dependencies

- Before installing, check the current stable version, dist-tags and compatibility with the rest of the stack.
- Do not install RC, beta or canary versions without explicit consent. Prisma 8 — only after GA, in a separate
  iteration.
- Exact versions of key packages (`prisma`, `@prisma/client`, `@prisma/adapter-pg`, `@nestjs/*`, `better-auth`,
  `@thallesp/nestjs-better-auth`, TanStack Start) — in the pnpm catalog. A Renovate rule forbids the Prisma major update
  to 8.
- Update deliberately, in separate changes.
- Keep dependencies minimal: if the platform or a small amount of own code solves the task, do not add a library.

### 6.5 Accessibility

- Complex widgets (dialogs, menus, selects, tabs, tooltips) are built on headless primitives; simple elements — on
  native HTML.
- Keyboard navigation, visible focus, ARIA attributes and respect for `prefers-reduced-motion` are mandatory.

### 6.6 Backward compatibility and migrations

Web and api are deployed independently: a monorepo commit is atomic, a deploy is not. For some time the new version of
one part runs against the old version of the other.

- Change the API by expand/contract: add a new field or endpoint, switch the client to it, and remove the old one only
  after the client is deployed.
- Do not remove or rename fields and endpoints in one step. A breaking change goes only through a new version
  (`/api/v2`) or a phased migration.
- The same rule applies to the WebSocket protocol: a new envelope version is supported in parallel with the old one
  until clients update.
- **DB migrations:**
  - A migration during a deploy must not break the previous api version that is still running.
  - Since Prisma 7.4, the statements of a multi-statement PostgreSQL migration are committed separately: a failed
    migration leaves the DB half-applied. Therefore one migration holds one logical change, and destructive steps go
    into a separate contract phase. Check the 7.x changelog before adopting.
  - Expand/contract for a column: nullable column → code writes to both fields → backfill by a job → `NOT NULL` →
    removal of the old column.
  - Indexes on large tables — `CREATE INDEX CONCURRENTLY` in a separate migration.
  - A backup before `migrate deploy`.
  - Migrations are applied by a one-off container before traffic switches; api startup does not apply them.
  - Prisma performs a move of a model between schemas as dropping and creating the table — data is moved manually by an
    SQL migration.
- **Automated checks:**
  - squawk — SQL migration linter;
  - `prisma migrate diff` — drift detection;
  - `openapi.json` is committed, `oasdiff breaking` compares it with main;
  - for WS — a snapshot test of the envelope JSON Schema.

### 6.7 Operations

- **Network and access:**
  - Only Caddy publishes ports. PostgreSQL and api stay in the internal Docker network or on `127.0.0.1`: ports
    published by Docker bypass ufw rules.
  - The provider firewall opens 22, 80, 443.
  - Express: `trust proxy` = 1. Caddy replaces the client IP header value and passes `X-Request-Id`.
- **Images:** multi-stage, `node:26-slim`, non-root user, `read_only` with `tmpfs`, tags by git SHA, memory limits and a
  matching `--max-old-space-size`, Docker log rotation (`max-size`, `max-file`).
- **Zero-downtime deploy:**
  1. backup;
  2. migrations container;
  3. new api via `docker rollout` (or `docker compose up --scale api=2 --no-recreate --wait` with health checks and
     `lb_try_duration` in Caddy);
  4. readiness;
  5. draining the old instance.

  `stop_grace_period` is longer than the drain timeout. Static files are replaced atomically (directory switch).
- **Backups:** a daily `pg_dump -Fc` to a separate R2 bucket (write-only token, lifecycle rule). A weekly automatic
  restore into a separate container with a row count comparison and an alert on failure. A backup without a restore
  check is a hypothesis.
- **Host:** `unattended-upgrades`, SSH by key only, no root login, fail2ban, cleanup of old images.
- **Monitoring and alerts:**
  - external uptime monitoring on `/health/ready` and the home page;
  - alerts on unavailability, growth of 5xx, a failed backup or restore check, disk usage above 80 %, billing alerts;
  - Sentry with `requestId` and `release` (git SHA), source maps from CI;
  - OpenTelemetry traces with auto-instrumentation of HTTP, pg and Prisma — to a free cloud tier with 10–20 % sampling.

## 7. Work process

- Every iteration goes through Research → Plan → Implement → Validate.
- Agree the iteration plan with Sergei before implementation.
- Record key decisions as ADRs in `docs/adr/`: context, decision, alternatives, consequences.
- At the end of an iteration write a report: what was done, how it was verified, open questions, the next step. Update
  the iteration status in the roadmap.
- Git: Sergei creates commits and PRs and pushes; the rules are in section 11.3.
- Keep CLAUDE.md compact: details go to `docs/`, links stay here. Rules for editing CLAUDE.md — section 11.4.

## 8. Roadmap

Statuses: `[ ]` not started, `[~]` in progress, `[x]` done.

### `[~]` Iteration 0 — Skeleton and tooling

Goal: a working monorepo with quality tools and a local environment.

Scope:
- Start procedure: done on 2026-11-08 — rules transferred (section 11), versions checked (section 3), language and git
  process agreed (sections 2 and 11.3).
- Monorepo per section 4, shared root configs: tsconfig base, ESLint, Prettier.
- pnpm catalog with exact versions, Renovate rules (section 6.4), supply chain protection in CI (section 6.1).
- Strict TypeScript and linting (section 6.3), Husky, lint-staged, commitlint, gitleaks.
- Choice of the api builder (SWC or Rspack) with decorator metadata.
- Internal packages strategy (`packages/contracts`): JIT packages exporting sources, or prebuilt via tsdown/tsup with
  `exports` and `types` — ADR.
- `apps/api`: Nest 12, endpoint `/api/v1/health`, Pino, graceful shutdown.
- `apps/web`: TanStack Start, one route, Tailwind, a call to the health endpoint.
- `packages/contracts`: the first schema (health response), used by both sides.
- `infra/local`: docker compose with PostgreSQL 18 and Mailpit.
- GitHub Actions: install → lint → typecheck → test → build via Turborepo, with the pnpm cache.
- README with commands, the `docs/` structure, ADR-0001 with the decisions from section 3.
- Move the roadmap to `docs/ROADMAP.md`; CLAUDE.md keeps only a link (section 11.4).

Done when:
- one command brings up the infrastructure, web and api locally;
- web shows the health endpoint response, with types from `packages/contracts`;
- CI is green, and a deliberate module boundary violation fails lint;
- the repository contains no secrets.

### `[ ]` Iteration 1 — Architecture and cross-cutting backend skeleton (learning)

Goal: Sergei understands how the backend works, decisions are recorded, the cross-cutting infrastructure (section 5.2)
is implemented before the first domain module.

Topics and decisions:
- The request lifecycle in Nest: middleware → guards → interceptors → pipes → handler → exception filters. DI and
  provider scopes.
- Map of service modules (section 1), public interfaces, a schema per module without cross-schema foreign keys,
  repositories.
- Transactions via CLS, two levels of events and pg-boss (section 5.3), idempotent handlers.
- IDs, time, `Clock`, optimistic locking, request idempotency.
- REST conventions, Problem Details and the error code registry, pagination, OpenAPI, confirmation of direct contract
  import.
- Backward compatibility with independent deploys (section 6.6).
- WebSocket architecture: gateway, protocol, authentication, limits, scaling.
- Authentication flow: sessions, cookie cache with JWT, JWKS and key rotation, CSRF, OAuth with PKCE, passkeys.
- Moderation module: statuses, trust levels, `PolicyService`, quotas, sanctions (section 5.8).
- Configuration and secrets, logs, traces, errors.
- Deployment topology: VPS, Caddy, containers, zero-downtime deploy.
- A walkthrough on an example: how a module is extracted into a separate service.

Implementation:
- `nestjs-cls` with `requestId`, `userId`, `locale`, propagated into Pino and Problem Details.
- A global Problem Details filter and the error code registry in `packages/contracts`.
- Env validation by a Zod schema via `@nestjs/config`.
- `StandardSchemaValidationPipe` and `StandardSchemaSerializerInterceptor`.
- The `Clock` and `PubSub` interfaces, `Idempotency-Key`.

Result: `docs/architecture/` with Mermaid diagrams, an ADR for each decision, the cross-cutting skeleton in code.

Done when the ADRs are agreed with Sergei, he can explain the request lifecycle and the authentication flow, and the
health endpoint passes through the whole skeleton: context, logs with `requestId`, Problem Details.

### `[ ]` Iteration 2 — Backend testing strategy (together with Sergei)

- Pyramid:
  - most — module integration tests (service + repository + real PostgreSQL);
  - fewer — unit tests of domain logic;
  - a small set of e2e tests (supertest, WS client);
  - contract tests.
- Isolation: Testcontainers PostgreSQL 18 in Vitest `globalSetup`, a separate database per worker via
  `CREATE DATABASE ... TEMPLATE` from a migrated template. Inside — transaction rollback or `TRUNCATE`; for e2e and code
  with pg-boss — `TRUNCATE`.
- Data factories per module (`createUser({ overrides })`) on top of repositories.
- An auth helper: creates a user and a session via the Better Auth API and returns a cookie.
- Test templates: "no session → 401", "another user's resource → 404", "unverified email → 403".
- `oasdiff breaking` and squawk in CI.

Result: `docs/testing/backend.md`, test infrastructure, example tests on the health module.

### `[ ]` Iteration 3 — Frontend skeleton

- At the start of the iteration ask Sergei for his frontend testing strategy. Write tests only according to it.
- Move the rules from `docs/conventions/web.md` into `apps/web/CLAUDE.md` and confirm them with Sergei.
- FSD structure and Steiger.
- TanStack Start: routing, prerendering, code splitting. Prototype "Start → static directory → Caddy with `try_files`
  to the shell", version pinning (section 5.5).
- Session after hydration, protected routes with `ssr: false`, PixiJS via dynamic import.
- A thin API client with Problem Details parsing (section 5.4).
- Paraglide JS: `ru` and `en`, URL prefixes, `hreflang`.
- Case page structure in FSD, content format per locale (section 5.9), case image optimization (open question in
  section 9).
- `packages/ui`: tokens, Tailwind theme, the final choice of the headless library (Base UI or React Aria), first
  components.
- Form library choice: React Hook Form or TanStack Form.
- SEO basics (section 5.10), Lighthouse CI with budgets, size-limit, a stub for sending metrics via `web-vitals`.

Done when the static output prototype works behind Caddy, both locales serve prerendered pages, Lighthouse budgets are
met, and tests per Sergei's strategy run in CI.

### `[ ]` Iteration 4 — Infra-1: first production deploy

- Buy a domain, DNS in Cloudflare. The domain is fixed for good: passkeys depend on it (section 5.7).
- Choose a VPS provider: check current prices and plan availability.
- Host and network preparation (section 6.7).
- Dockerfile for api (section 6.7). Production compose: api and PostgreSQL.
- Caddy: HTTPS, serving web static files, reverse proxy for REST and WebSocket, `X-Request-Id`, the real client IP, WS
  stream settings.
- `/health/live`, `/health/ready`, `enableShutdownHooks`, `stop_grace_period`.
- GitHub Actions: image build, publishing to GHCR, zero-downtime deploy in the order of section 6.7. Secrets — in GitHub
  Environments.
- PostgreSQL backups to R2 and a weekly automatic restore check.
- Uptime monitoring, Sentry, alerts (section 6.7). Choice of a free cloud OpenTelemetry backend.

Done when the skeleton is available over HTTPS on its own domain, a merge into main triggers a zero-downtime deploy, and
the automatic restore check passes.

### `[ ]` Iteration 5 — DB and the first domain module: Web Vitals metrics

Goal: the first full-cycle service module — from data collection in the browser to an API for charts.

- **Prisma 7:**
  - `prisma.config.ts` with explicit `.env` loading; check the config file name on the installed version
    (`prisma.config.ts` or `prisma7.config.ts`);
  - a multi-file schema (the config points to a directory), `multiSchema`;
  - an explicit pool size that accounts for two instances during a deploy and the pg-boss connections;
  - the DB schema is set explicitly in the adapter (`@prisma/adapter-pg` ignores `?schema=` in the URL);
  - the client is generated into `apps/api/src/generated/prisma` (in `.gitignore`, section 11.11), `prisma generate` is
    a Turborepo task;
  - seeds — an explicit idempotent script (`upsert`), production reference data separate from demo data.
- Check `@nestjs-cls/transactional` compatibility with Prisma 7 and wire transactions via CLS.
- Migration rules (section 6.6), squawk in CI.
- pg-boss: connection, metric aggregation (p75 per hour and day, per page, metric and locale), cleanup jobs, job
  retention.
- An endpoint that receives metrics from `web-vitals` via `navigator.sendBeacon`, with the limits of section 6.2 item 5
  and data minimization (section 5.13).
- An aggregates API for the `pixi-charts` dashboard, OpenAPI.
- A `version` column template for editable entities.
- Frontend: wire up the metric sending prepared in iteration 3.

Done when metrics from production pages reach the DB without personal data, a pg-boss job computes aggregates and the
API serves them, and tests cover the limits of the intake endpoint.

### `[ ]` Iteration 6 — Authentication and moderation basics

- Better Auth in Nest with the settings of section 5.7:
  - `trustedOrigins`, the DB limiter with `customRules`, `advanced.ipAddress`;
  - the JWT plugin with key rotation;
  - a DB session check for sensitive operations;
  - body limits in `AuthModule`.
- Email and password, email verification, Google, passkeys. A decision on magic link and TOTP.
- A guard on `Origin` / `Sec-Fetch-Site` for mutating endpoints, account linking only with a verified email.
- Emails via pg-boss, `ru`/`en` templates, `email_log`.
- Turnstile, email quotas.
- Roles: administrator and user.
- Moderation module, basics (section 5.8):
  - user statuses and trust levels;
  - `PolicyService`, the violation signals table;
  - a ban with session revocation (check the Better Auth admin plugin);
  - a registration limit per IP and subnet, a disposable domain block list.
- `audit_log`.
- Account deletion with a cascade via `user.deleted`, data export by a pg-boss job.
- Privacy policy and terms of use in `ru`/`en` — before configuring the Google OAuth consent screen.
- Account UI: sign-in, sign-up, session list and revocation, account deletion.

Done when tests cover all flows, limits, quotas and bans are verified, and account deletion removes the user's data in
all modules.

### `[ ]` Iteration 7 — Files

- R2: production and development buckets, a separate bucket for backups, a subdomain for public serving, CORS.
- The upload pipeline per section 5.11: presigned PUT, confirmation (`HeadObject` → `file-type` → sharp → "available"),
  cleanup of unconfirmed uploads.
- Upload permissions and quotas via `PolicyService` (section 5.8), the global storage ceiling.
- Responsive images on the frontend.
- Spending alerts. Decide what replaces R2 in automated tests.

### `[ ]` Iteration 8 — WebSocket

- A gateway per section 5.6: an envelope with Zod validation, CLS per message, `maxPayload` 64 KB, a token bucket,
  connection limits, `bufferedAmount` control, an `Origin` check on upgrade.
- Heartbeat every 25–30 seconds, code 1012 on shutdown, resync by `seq`, in-memory `PubSub`.
- The first realtime feature (for example presence on a page).
- Tests: a real server on a random port; handshake without a cookie, `maxPayload` exceeded, rate limit, resync, code
  1012.

### `[ ]` Iteration 9 — PixiJS

- `packages/pixi-charts`; move the rules from `docs/conventions/pixi.md` into `packages/pixi-charts/CLAUDE.md`.
- A Web Vitals metrics dashboard on `pixi-charts` on top of the API from iteration 5.
- The pixi-demos case (github.com/rgbmoon/pixi-demos): decide how to embed it.
- An interactive part with data stored on the backend: a shared drawing board (preferred — it meets the "no game
  themes" condition) or a mini-game.
- **Drawing board model:**
  - no CRDT is needed, the server is the source of truth;
  - append-only `strokes`: `board_id`, a monotonic server `seq`, `author_id`, `points`, `color`, `width`,
    `created_at`; erasing is a separate operation;
  - `board_snapshots`: the state at `seq` N; a pg-boss job creates snapshots;
  - resync: the client sends the last `seq`, the server returns a snapshot and the tail of operations;
  - line simplification (Ramer–Douglas–Peucker) and batched sending of points every 50 ms.
- Protection per section 5.8:
  - write access only for authenticated users;
  - limits on points per stroke, strokes per board and per minute;
  - deleting all strokes of a user in one operation;
  - canvas clearing by the administrator.

### `[ ]` Iteration 10 — Publication builder and product features

- The publication builder as a separate case. Registered users create publications.
- A decision on publication rendering (section 5.5): review the options with an explanation of the mechanics, then an
  ADR.
- Publications module:
  - structured JSON blocks with Zod validation, `slug`;
  - `version` and `If-Match`, `Idempotency-Key` on publishing;
  - a trash for 30 days.
- UGC protection per section 5.8:
  - quotas and global ceilings;
  - trust levels, link sanitization, duplicate hash, stop lists;
  - reports with auto-hiding, automatic sanctions;
  - administrator tools.
- Publication media — through the pipeline from iteration 7. Upload by a user-supplied URL is forbidden.
- Decisions: bilingual publications, demo publication lifetime, pre-moderation for trust level 0.
- Detailing of the further roadmap.

## 9. Open questions

| Question | Where decided |
|---|---|
| Env files: a committed `.env` with non-secret values (pixi-demos) or only `.env.example` without values (section 6.1) | Iteration 0 |
| Confirmation of direct contract import instead of client generation | Iteration 1 |
| Public identifier: UUIDv7 or a separate opaque ID | Iteration 1 |
| Fully static web output or a separate container | Iteration 3 |
| Case page content format | Iteration 3 |
| Case image variants: generated at build time (section 5.10) or precomputed by a script and committed (section 11.6) | Iteration 3 |
| Base UI or React Aria | Iteration 3 |
| React Hook Form or TanStack Form | Iteration 3 |
| VPS provider | Iteration 4 |
| Zero-downtime deploy tool: docker rollout or a script | Iteration 4 |
| Free cloud OpenTelemetry backend | Iteration 4 |
| `@nestjs-cls/transactional` compatibility with Prisma 7, Prisma config file name | Iteration 5 |
| Metric aggregation and retention | Iteration 5 |
| Better Auth integration with Nest: community package or own guard | Iteration 6 |
| Magic link or one-time code, TOTP 2FA | Iteration 6 |
| Ban via the Better Auth admin plugin or own implementation | Iteration 6 |
| Email templates: React Email or MJML | Iteration 6 |
| Thresholds for automatic sanctions and trust levels | Iterations 6 and 10 |
| R2 replacement in automated tests | Iteration 7 |
| Embedding pixi-demos: iframe or package | Iteration 9 |
| Interactive part: drawing board or mini-game | Iteration 9 |
| Publication rendering: client pages with `noindex` or a debounced rebuild | Iteration 10 |
| Bilingual publications | Iteration 10 |
| Demo publication lifetime | Iteration 10 |
| Pre-moderation for trust level 0 | Iteration 10 |

## 10. Deferred and excluded

**Deferred:**
- Redis / Valkey — until a second permanent api instance or WS pub/sub.
- A message broker and an outbox with a relay — until the first dedicated service.
- Moving to Kubernetes (k3s) or Docker Swarm — until there are several hosts.
- Scaling WebSocket to several instances via Redis pub/sub.
- CRDT / Yjs for the drawing board — only with an offline mode or collaborative text editing.
- WAL-G and PITR — when an RPO below one day is needed.
- Prometheus, Grafana, Loki on the VPS — they consume resources; free cloud plans cover the need.
- OpenAPI client generation for web — until external consumers appear.
- Prisma 8 — after GA, in a separate iteration.
- TypeScript 7 — after typescript-eslint and `@nestjs/cli` support it.
- `@nestjs/observe` as the observability basis — after its SDK stabilizes.
- An external text moderation API — when the UGC volume grows.

**Excluded:**
- AWS sandbox.
- CDN.
- MDX. Case texts live in typed TS modules, service data in the DB.
- Storing cases in the DB and a CMS for cases: cases are frontend pages (section 1).
- MUI and other heavy UI libraries.
- Storing tokens in localStorage.
- Universal soft delete in all tables.
- Request-scoped providers, CQRS, Event Sourcing.
- `@nestjs/schedule` for cron.
- Device fingerprinting.
- Raw HTML in user content, uploads of SVG and other active formats.

## 11. Transferred rules

Transferred on 2026-11-08 from the CLAUDE.md files and Claude memory of Sergei's projects pixi-demos, pixi-game and
mimictears and adapted to this stack. Rules for areas that start in later iterations are in `docs/conventions/`
(section 4).

### 11.1 Writing style

Applies to any text: chat answers, plans, JSDoc, `//` comments, CLAUDE.md, documentation, README. Agreements read as a
reference: a figure of speech forces a reader to reread the line to extract the fact.

- No metaphors, clichés, pathos ("the last line of defense", "single source of truth"), or slang except technical
  terms.
- No dichotomies "does X, not Y": keep the statement, drop the negation.
- No "X is about Y" constructions: they name a topic instead of making a statement. Write what the thing does: "the
  flag weakens protection against page code".
- Do not personify code or tools. A red flag is a verb normally applied to a person ("knows", "wants", "survives",
  "eats", "decides") with code as the subject. Describe mechanics with plain verbs: "tracks", "compensates", "depends
  on", "is centered".
- Describe relations between modules through imports and dependencies: "the adapter depends only on the model", "the
  model imports no monorepo packages".
- Every action names its subject and target: "when `OrdersService` receives a `create` call"; "when the response
  arrives" names neither.
- Name a technical object by its class name or an established term (`NineSliceSprite`, 9-slice); do not invent words.
- One term per concept in code, JSDoc, documentation and test names; code and documentation change together.
- Verify a statement about code behavior against the code before it goes into an answer or a document.
- Russian chat text: no calques or anglicism slang («флаки», «фолбэчит», «джоба падает», «ран», «прод-код», «мимо
  кэша») — describe in Russian: «тесты падают через раз без изменений в коде», «запуск workflow», «без кэша». Do not
  invent words; if a word is not used in ordinary speech, rephrase descriptively.
- Before sending, reread every comment, documentation paragraph and answer paragraph and rewrite each figure of speech
  as a direct statement: who does what and why.

### 11.2 Decisions

- An unresolved technical choice or an open product decision is a question to Sergei before work starts.
- Present a choice as options with arguments; do not present one option as the only correct one. Sergei expects
  objections and evaluates arguments on their merits.
- Do not repeat a rejected proposal without a new argument.
- A decision is revisited only on new facts. An error found in my own reasoning is a new fact: report it at once. If a
  re-check changes a decision Sergei has already made, say so directly and ask again.
- Do not revert Sergei's edits to code and comments; do not restore comments he removed.
- Roadmap and plan wording is a draft; verify it like my own conclusions.

### 11.3 Git

- Sergei creates commits and PRs and pushes. Claude does not commit, push, open PRs or deploy unless explicitly asked,
  each time. An approved plan that mentions commits or "branch → PR" does not grant this.
- Work ends with changes in the working tree; the final message lists what is ready to commit and proposes Conventional
  Commits messages. Plans contain no "commit 1/2" steps.
- Commit messages: Conventional Commits in English. commitlint checks commits in the `commit-msg` hook.
- One branch per iteration with a PR into main; direct pushes to main are blocked. PRs are merged by squash merge: the
  PR title becomes the commit message in main, so CI checks the PR title against Conventional Commits.
- Production is deployed only by CI.

### 11.4 CLAUDE.md files

- CLAUDE.md records agreements. Work progress is not written into it; what can be read from the code is not
  duplicated.
- Work progress, plans and task statuses live in working files in `work.local/`. When the work closes, general rules
  from them move into CLAUDE.md and the file is deleted. The roadmap is a project document in `docs/ROADMAP.md`.
- Edit it immediately, without prior approval, together with the code change or decision that caused the edit. Edits
  are targeted: only the affected item changes. The answer lists what changed in the document.
- A mismatch between a document and the code is a reason to report it; neither the document nor the code is rewritten
  silently.
- The root CLAUDE.md holds general rules; directories have their own CLAUDE.md files, and the root one lists them in a
  table. Before working in a directory, read its CLAUDE.md and those of its parent directories.

### 11.5 Session budget and verification

The session limit is shared. The main cost is reasoning volume and the context that is resent with every call: what is
read early becomes more expensive with each following step.

- Subagents (Plan, Explore and others) run only at Sergei's request, even if a mode procedure suggests them.
- Plan mode: read the tests and the relevant APIs, run the tests with timings, ask questions, write a short plan to a
  file and call ExitPlanMode right away.
- Look up the shape of an API call by grepping its signature. Read a method body when behavior matters: side effects,
  call order, cleanup, subscriptions.
- Settle disputed technical details (limits, performance, library behavior) with a short code run. Library sources
  are not read for this.
- **Baseline check of every recommendation** (a few greps):
  - which tests cover the place and through what — doubles or real code. Logic moved into a class that tests replace
    with a double drops out of test coverage: the scenario then checks a copy of the logic in the double;
  - whether the domain already uses the proposed marker values (`null`, `undefined`);
  - which tests pin the current behavior.

  If the check changes an accepted decision, say so directly and ask again.
- **The deepest re-check** (every conclusion verified against sources: own code, libraries, tests) — only on an
  explicit request or after a budget question (what to check, why, approximate cost) that Sergei approved. A change of
  the model effort level is not such a request.

### 11.6 Cost of new entities

- A new class, module or lint level has a cost. A split is accepted when it brings logic under tests: when proposing
  one, list the scenarios that become testable, how they run, and the doubles that can be removed. "Remove
  duplication" or "cleaner layering" alone is not accepted. The architecture of section 5 is an explicit decision; this
  rule applies to entities beyond it.
- A service, model or state store is created only for state that cannot be derived from data and time. Behavior driven
  by static config and the current time needs no separate entity.
- Data that can be computed in advance is computed by a script, and the result is committed. Runtime computation
  disappears, and tests check constraints on the real data.
- The build is minimal for the task: abstractions for hypothetical extension appear only on request.
- Self-check for overengineering: after writing a solution, compare its size with the task. If the solution follows the
  rules formally but is bulky (more files, entities or indirection than the task needs), design a simpler variant and
  present both to Sergei; he chooses which one stays.

### 11.7 Architecture and imports

- Every top-level folder with code is a workspace package with its own `package.json`, dependencies and tests; code
  lives in `src/`. Packages are split by runtime: plain TS, Zod, React, PixiJS, Node.
- The import graph is one-directional; `import-x/no-cycle` is enabled.
- Between packages, import only by package name: no rule checks a relative `../..` path across a package boundary.
- The dependency direction between packages is set by their `package.json`: pnpm does not resolve an undeclared
  package, and `import-x/no-extraneous-dependencies` reports a lint error.
- ESLint checks restrictions beyond `package.json`: `@typescript-eslint/no-restricted-imports` with `allowTypeImports`
  and a `files:` block per package and per level; in api — eslint-plugin-boundaries (section 5.1).
- In flat config a rule with the same name in a later block replaces the earlier one entirely. A level block must
  repeat the package restrictions; otherwise they stop working without an error.
- A boundary between layers is expressed as an import ban: a layer that cannot import a module cannot violate the
  boundary in code.
- An external library with a wide or unstable API is imported by one wrapper module; the rest of the code uses it
  through own types, so replacing the library touches only that module. ESLint enforces the ban. Examples: Prisma — only
  module repositories; PixiJS — only `packages/pixi-charts`.
- A class with state gets its own folder; `utils/` holds only pure functions.
- Leaves of the graph — `types`, `constants`, `utils` and data catalogs — import nothing from the application.
- Build scripts and tools (`tools/`) import nothing from `src`; application code does not import `tools/`.

### 11.8 Code conventions

**File layout:**
- The split rules of this item apply only to code with classes. A class file `<name>.ts` holds one class and nothing
  else: no free functions, types, constants or singletons. The types, constants, utilities and DI tokens of a layer
  with classes live in `types.ts`, `constants.ts`, `utils.ts`, `tokens.ts`. A `utils/` folder appears when `utils.ts`
  grows and splits by topic; imports address files directly, the folder has no barrel.
- Code without classes (tool configs, config factories, function modules) follows the layout of the official examples
  of the library in use. If the layout is not obvious, ask Sergei.
- No empty placeholder files; no module-scope singletons (the exception is the entry point).
- `index.ts` exists only as the public API of an FSD slice and of an api module; inside them, imports address files.
  Packages expose their API through `exports` in `package.json`. Internal packages are JIT: `exports` point to `.ts`
  sources, and every consumer compiles them; packages have no build step (ADR-0003).
- Zod schemas of REST DTOs, WS messages and events live in `packages/contracts`; `z.infer` types sit next to their
  schemas.

**Naming:**
- `apps/api`: the Nest convention — a folder per module, the role in the file name: `users/users.service.ts` →
  `UsersService`.
- `apps/web`: FSD segments (`ui/`, `model/`, `api/`, `lib/`, `config/`) — the folder sets the role, the file name is the
  bare entity.
- Elsewhere: in a role folder the file name is the bare entity and the class name carries the role suffix
  (`services/payment.ts` → `PaymentService`); in a subsystem folder the file name is the kebab-case class name
  (`queue/job-runner.ts` → `JobRunner`).
- Files are `kebab-case`, React component folders `PascalCase`, constants `SCREAMING_SNAKE_CASE`. A DI token is named
  after the class it resolves.

**Exports and types:**
- Named exports only; a default export only where a tool requires it (config files, SVG via `?react`).
- No `any`; `@ts-expect-error` instead of `@ts-ignore`.
- Type-only imports are mandatory, except in `apps/api` for classes injected through a constructor: they are imported
  as values, because `import type` removes the class from the decorator metadata and Nest cannot resolve the
  dependency.
- Enum-like sets — an `as const` object plus a derived type; `enum` is not used.
- A weakness a type can catch is fixed by strengthening the type: `Record<string, …>` → `Partial<Record<Key, …>>`
  exposed unused keys without a single test.
- Free wrappers over methods are not extracted: destructuring loses `this`.

**Imports:**
- Own modules through the `imports` field of `package.json` (`#src/*`); another package by its name. Relative paths only
  for sibling and child files.
- In `apps/api` and `packages/*` import specifiers of own files carry the `.ts` extension (`#src/app.module.ts`,
  `./status.ts`): the path names the real file, and Node loads package sources and `tools/` scripts directly. Their
  `tsconfig` files set `allowImportingTsExtensions` and `noEmit`; tsc only checks types (ADR-0003).
- ESLint enforces the order: `builtin → external → internal`, `react` first, alphabetical; monorepo packages and
  `#src/*` form the internal group.

**TypeScript:**
- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noImplicitReturns`,
  `verbatimModuleSyntax`, `noUnusedLocals`, `noUnusedParameters`; unused parameters have a `_` prefix. They live in
  the root `tsconfig.base.json`; a package `tsconfig.json` adds only its own options (`types`, `lib`, decorators).
- `erasableSyntaxOnly` everywhere except `apps/api`. `apps/api` follows the Nest idiom: `experimentalDecorators` and
  `emitDecoratorMetadata` are on, parameter properties (`constructor(private readonly users: UsersService)`) are
  allowed. Rspack bundles the api (ADR-0002), so Node type stripping compatibility gives it nothing.

**Asynchrony:**
- `async/await` with `try/catch`; `.then()/.catch()` are not used (the exception is the constructor of a deferred
  promise resolved from outside).
- The linter forbids floating promises: a promise is awaited or marked `void`, and then the function handles its own
  errors inside.

**Formatting:**
- `.prettierrc.json`: no semicolons, single quotes, 120 columns. lint-staged formats staged files (section 6.3).
  Do not reformat other code by hand.
- Markdown is excluded from Prettier (`.prettierignore`): Prettier pads table columns to the widest cell, and an edit of
  one cell rewrites the whole table. Markdown is wrapped at 120 columns by hand.

**Avoid:**
- `any`, `@ts-ignore`, `console.*`, `debugger` (api logs through Pino; in web the exceptions are trace functions).
- Empty `catch`, floating promises.
- Module-scope singletons.
- Manual memoization without need.
- Types, constants and free functions in a class file.

### 11.9 Comments and JSDoc

Inline docs are short and dry: explanations of "why" go to the chat and ADRs, agreements go to CLAUDE.md.

- Classes, public methods and utilities get JSDoc on what they do: 1–2 lines, dry engineering language, plain words.
  Section 11.1 applies in full.
- A class JSDoc is one sentence about the entity's role in plain words. Location, lists of cache keys and other details
  visible in the code are not written. The reason for a non-obvious decision is a plain phrase: "…which would cause
  visual bugs".
- No plans in JSDoc; a needed plan is a `TODO`.
- `//` comments only at non-obvious decisions, one or two lines.
- Comment only new and changed code; do not add comments to unchanged existing code.
- Comments that Sergei removed or edited in review are not restored.

### 11.10 Tests

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

### 11.11 Tooling

- Node scripts run by plain `node`: import specifiers carry `.ts` (section 11.8). A script that imports modules without
  file extensions runs through `tsx`: Node type stripping does not resolve such modules.
- Generated output that is reviewed in a diff or checked by CI is committed: `openapi.json` for oasdiff, precomputed
  data. Code that a Turborepo task generates deterministically from committed sources before typecheck is not
  committed: the Prisma client, the Paraglide output. A manual edit of a generated file is lost on the next run: edit
  the source or the script.
- Automated e2e tests run through the Playwright runner. Manual viewing and clicking in the live UI — only for a task
  that needs a visual or interactive check.
- ESLint has one `eslint.config.ts` in the repository root. ESLint 10 finds it from any package folder; rules of one
  package are blocks with `files` patterns relative to the root. ESLint loads the TypeScript config through `jiti`:
  without it ESLint 10 needs the unstable flag `unstable_native_nodejs_ts_config`.

**CI and deploy:**
- Turborepo caches tasks by the hash of their inputs; an edit in a package's `src` invalidates the cache of tasks in
  dependent packages. The Turborepo cache is saved between runs (`actions/cache`, `.turbo/cache`); Playwright browsers
  are installed only when the e2e task has no cache entry.
- Tests and e2e run in CI; pre-commit runs only lint-staged and gitleaks.
- Deploy runs only from main after green checks and e2e. The deploy job publishes the build artifact from the e2e job,
  so the verified build is published. A manual workflow run executes the same checks with `turbo --force`.
