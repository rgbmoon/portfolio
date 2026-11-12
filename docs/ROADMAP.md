# Roadmap

Sections 8–10 of the root CLAUDE.md. The iteration status is updated at the end of each iteration (CLAUDE.md
section 7).

## 8. Roadmap

Statuses: `[ ]` not started, `[~]` in progress, `[x]` done.

### `[x]` Iteration 0 — Skeleton and tooling

Goal: a working monorepo with quality tools and a local environment. Closed on 2026-11-12.

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
- Move the roadmap to `docs/ROADMAP.md`; CLAUDE.md keeps only a link (section 11.4). Done on 2026-11-10:
  sections 3, 5, 6.2, 6.5–6.7, 8–10 and 11.7–11.11 moved to the files listed in CLAUDE.md section 4.

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
- `vite build` does not evaluate modules: a build without `VITE_API_URL` passes, and the page fails on load.
  Prerendering evaluates `config.ts` at build time; check that a missing variable fails the build.

Done when the static output prototype works behind Caddy, both locales serve prerendered pages, Lighthouse budgets are
met, and tests per Sergei's strategy run in CI.

### `[ ]` Iteration 4 — Infra-1: first production deploy

- Buy a domain, DNS in Cloudflare. The domain is fixed for good: passkeys depend on it (section 5.7).
- Choose a VPS provider: check current prices and plan availability.
- Host and network preparation (section 6.7).
- Dockerfile for api (section 6.7). Production compose: api and PostgreSQL.
- Caddy: HTTPS, serving web static files, reverse proxy for REST and WebSocket, `X-Request-Id`, the real client IP, WS
  stream settings.
- `/health/live`, `/health/ready`, `enableShutdownHooks`, `stop_grace_period`. On SIGTERM the api exits with status
  143: Nest runs the shutdown hooks, then re-raises the signal.
- The root `prepare` script runs `husky` on every install that changes `node_modules`; check it in the Docker build
  stage, which has no `.git` folder.
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
| Confirmation of direct contract import instead of client generation | Iteration 1 |
| Optional fields in Zod contracts under `exactOptionalPropertyTypes`: `.optional()` or `.exactOptional()` | Iteration 1 |
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
