# 3. Stack (decisions made)

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
