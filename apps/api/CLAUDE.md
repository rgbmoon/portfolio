# CLAUDE.md — apps/api

Backend rules: sections 5.1–5.3 and 5.6 of the root CLAUDE.md. Sections for future modules (5.7, 5.8, 5.11–5.13, 6.2)
are in `docs/architecture/`; the task plan lists the ones a task needs. The section index is in section 4 of the root
CLAUDE.md.

## 5.1 Backend: modular monolith

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

## 5.2 Cross-cutting backend infrastructure

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

## 5.3 Domain events and background jobs

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

## 5.6 Transport

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
