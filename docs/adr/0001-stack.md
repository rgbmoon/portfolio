# ADR-0001: Stack

- Status: accepted
- Date: 2026-11-08

## Context

The project adds a backend and infrastructure to Sergei's frontend experience: a public repository with product case
studies, a production deployment and verification under real conditions (CLAUDE.md section 1). Sergei works with
React, TypeScript, TanStack, Zustand, Vitest and PixiJS; backend, Docker and operations are new areas for him.

The backend serves the case pages: authentication, moderation, Web Vitals metrics, files, drawing, publications,
realtime and email. The project runs on one VPS with free or low-cost cloud plans (CLAUDE.md section 6.2).

## Decision

The table with versions and notes is in [docs/architecture/stack.md](../architecture/stack.md); versions were checked on
2026-11-08. The main choices:

- **Language and runtime.** TypeScript 6.0 in strict mode in every package, Node.js 26 LTS. Web and api import the
  same Zod schemas from `packages/contracts`.
- **Monorepo.** pnpm 12 workspaces with a catalog of exact versions; Turborepo runs the task graph and caches task
  results.
- **Backend.** NestJS 12 with the Express adapter, a modular monolith; eslint-plugin-boundaries checks the module
  boundaries. Zod 4 validates input and serializes responses through the Standard Schema pipe and interceptor of
  Nest 12.
- **api build.** Rspack bundles the api with decorator metadata ([ADR-0002](0002-api-build-rspack.md)). Internal
  packages export TypeScript sources and have no build step ([ADR-0003](0003-internal-packages-jit.md)).
- **Data.** PostgreSQL 18 for its built-in `uuidv7()`. Prisma 7 with `@prisma/adapter-pg`. pg-boss stores jobs in
  PostgreSQL, so a job is enqueued in the same transaction as the data.
- **Frontend.** TanStack Start on Vite 8, TanStack Router and Query, Zustand, Tailwind, Paraglide JS, PixiJS 8.
- **Authentication.** Better Auth.
- **Infrastructure.** Docker Compose on a VPS, Caddy, GitHub Actions, GHCR; Cloudflare DNS, R2 for files and
  Turnstile for forms.
- **Observability.** Pino, OpenTelemetry, Sentry on the free plan, an external uptime monitor.

## Alternatives

- **Fastify adapter.** Rejected: its support in the Better Auth integration for Nest is in beta.
- **TypeScript 7.** Deferred: typescript-eslint 8 requires TypeScript below 6.1.0, and `@nestjs/cli` depends on
  `~6.0.2`.
- **Prisma 8.** Deferred: on 2026-11-08 the npm tag `latest` of `prisma` pointed to the 8.0 release candidate. Prisma 8
  is adopted after GA, in a separate iteration.
- **Redis or Valkey.** Deferred until a second permanent api instance or WebSocket pub/sub.
- **Kubernetes (k3s) or Docker Swarm.** Deferred until the project runs on several hosts.
- **The `@base-ui-components/react` package.** Rejected: it stopped at 1.0.0-rc.0; Base UI continues as
  `@base-ui/react`.
- **SWC per-file build and prebuilt internal packages.** Rejected in [ADR-0002](0002-api-build-rspack.md) and
  [ADR-0003](0003-internal-packages-jit.md).

Sources: the notes of [docs/architecture/stack.md](../architecture/stack.md) and section 10 of
[docs/ROADMAP.md](../ROADMAP.md).

## Consequences

- Key packages have exact versions in the pnpm catalog (CLAUDE.md section 6.4). Renovate holds Prisma below 8 and
  TypeScript below 6.1.0 (`renovate.json`).
- Node type stripping does not support decorators, so the api has a compile step ([ADR-0002](0002-api-build-rspack.md)).
- Docker Compose runs on one host. Redis and Kubernetes come back with a second permanent api instance or a second
  host.
- Some choices inside the stack are open questions of later iterations ([docs/ROADMAP.md](../ROADMAP.md) section 9):
  Base UI or React Aria (iteration 3), `@nestjs-cls/transactional` with Prisma 7 (iteration 5), the Better Auth
  integration with Nest (iteration 6), React Email or MJML (iteration 6).
