# Portfolio

Sergei's portfolio site: product case studies built with the technologies of his stack. The repository holds the web
app, the api, shared packages, local infrastructure and the project documentation.

Development rules: [CLAUDE.md](CLAUDE.md). Roadmap: [docs/ROADMAP.md](docs/ROADMAP.md). Stack:
[docs/architecture/stack.md](docs/architecture/stack.md). Decisions: [docs/adr/](docs/adr/).

## Structure

- `apps/web` — web app on TanStack Start.
- `apps/api` — NestJS api, a modular monolith.
- `packages/contracts` — Zod schemas shared by web and api.
- `infra/local` — Docker Compose for development: PostgreSQL and Mailpit.
- `docs/` — roadmap, decisions, architecture.

## Requirements

- Node.js from `.nvmrc` through [nvm](https://github.com/nvm-sh/nvm): run `nvm install` in the repository root.
- pnpm 12: run `npm install -g pnpm@12.18.0` under Node 26. A pnpm 10 installed from an older Node does not switch to
  the version in `packageManager`: the command fails with `ENOEXEC`.
- Docker with Docker Compose.
- [gitleaks](https://github.com/gitleaks/gitleaks) for the pre-commit hook: `brew install gitleaks` on macOS, a binary
  from the [releases page](https://github.com/gitleaks/gitleaks/releases) on other systems. Without gitleaks the hook
  fails every commit.

## Setup

```sh
git clone https://github.com/rgbmoon/portfolio.git
cd portfolio
nvm install
pnpm install
```

`pnpm install` runs the `prepare` script, which sets `git config core.hooksPath` to `.husky/_`. pnpm skips `prepare`
when `node_modules` is already up to date: if `git config core.hooksPath` prints nothing, run `pnpm exec husky`.

Copy each environment example to `.env` in the same folder and fill in the values; the comments in the examples
describe each key. `.env` files are ignored by git.

- `apps/api/.env.example`
- `apps/web/.env.example`
- `infra/local/.env.example`

## Commands

| Command | Action |
|---|---|
| `pnpm dev` | Starts PostgreSQL and Mailpit (`pnpm infra:up`), then the api and web dev servers |
| `pnpm infra:up` | Starts PostgreSQL and Mailpit and waits for their healthchecks |
| `pnpm infra:down` | Stops the containers; the PostgreSQL volume stays |
| `pnpm build` | Builds the api (Rspack) and the web app (Vite) |
| `pnpm lint` | Runs ESLint in every package |
| `pnpm typecheck` | Runs tsc in every package and for the root configs |
| `pnpm test` | Runs the Vitest tests in the `tests/` folders |
| `pnpm test:e2e` | Runs the e2e tests on the production build |
| `pnpm verify` | Runs the format check, lint, typecheck, tests, build and e2e tests |
| `pnpm format` | Formats files with Prettier |
| `pnpm format:check` | Checks formatting with Prettier |

`docker compose -f infra/local/compose.yaml down -v` stops the containers and deletes the PostgreSQL volume.

Prettier skips Markdown files: they are wrapped at 120 columns by hand.

Addresses in development:

- web app: `http://localhost:5173`;
- api health endpoint: `<VITE_API_URL>/api/v1/health`;
- Mailpit UI: `http://127.0.0.1:8025`, SMTP: `127.0.0.1:1025`.

## Git hooks

Husky installs two hooks:

- `pre-commit` runs lint-staged (`eslint --fix` and Prettier on the staged files), then
  `gitleaks git --pre-commit --staged`, which scans the staged changes for secrets;
- `commit-msg` runs commitlint with the [Conventional Commits](https://www.conventionalcommits.org/) rules.

Hooks are never skipped: no `--no-verify`, no `HUSKY=0`.

A GUI git client starts hooks without the shell profile, so the Node of nvm is missing from `PATH`. Before each hook
Husky sources `~/.config/husky/init.sh`; load nvm in that file:

```sh
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
```

If the client also misses gitleaks, add its directory to `PATH` in the same file.

## CI

GitHub Actions run on every PR and on every push to `main`. Actions are pinned by commit SHA, and the workflow token
can only read the repository.

- `ci.yml`, job `checks`: `pnpm install --frozen-lockfile`, then the format check, lint and typecheck, tests, build and
  e2e tests through Turborepo. The pnpm store and `.turbo/cache` are saved between runs. A manual run
  (`workflow_dispatch`) executes every task without the Turborepo cache.
- `ci.yml`, job `gitleaks`: scans the whole git history for secrets.
- `ci.yml`, job `audit`: `pnpm audit --audit-level high`.
- `pr-title.yml`: commitlint checks the PR title. A squash merge uses the PR title as the commit message in `main`.

## Dependency updates

pnpm installs only versions published at least 3 days ago (`minimumReleaseAge` in `pnpm-workspace.yaml`). Renovate
(`renovate.json`) proposes updates of npm packages, the pnpm catalog, GitHub Actions and Docker images 7 days after a
release. It holds Prisma below 8, TypeScript below 6.1 and PostgreSQL image majors, and groups the `@nestjs/*` updates
in one PR.

## Documentation

- [docs/ROADMAP.md](docs/ROADMAP.md) — iterations, open questions, deferred and excluded items.
- [docs/adr/](docs/adr/) — architecture decisions: context, decision, alternatives, consequences.
- [docs/architecture/](docs/architecture/) — stack and module rules.
- [docs/conventions/](docs/conventions/) — rules for areas that start in later iterations.
