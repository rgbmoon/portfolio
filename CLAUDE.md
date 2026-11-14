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

In [docs/architecture/stack.md](docs/architecture/stack.md). Read it before adding or updating a dependency.

## 4. Repository structure

```
.claude/
  hooks/          hook scripts for settings.json
  rules/          rules loaded by file path (table below)
.github/
  workflows/      CI and the PR title check
.husky/           git hooks: pre-commit, commit-msg
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
  ROADMAP.md      roadmap, open questions, deferred and excluded items (sections 8–10)
  adr/            architecture decisions (NNNN-title.md)
  architecture/   architecture description, Mermaid diagrams, module rules read on demand
  conventions/    rules for areas that start in later iterations
  testing/        testing strategies
```

The structure is refined in iteration 0. A package appears when it is first needed; empty placeholders are not created.
Workspace packages use the scope `@portfolio/*`. Folders matching `*.local/` (working files, review materials) are
ignored by git (section 11.4). Reflect every change in this section.

Shared configs live in the root: `tsconfig.base.json` (every package `tsconfig.json` extends it), `eslint.config.ts`,
`.prettierrc.json`.

Documents with rules. Section numbers are stable identifiers: a reference such as "section 5.8" points to the file in
this table.

| Sections | File | Loaded |
|---|---|---|
| 3 | [docs/architecture/stack.md](docs/architecture/stack.md) | on demand |
| 5.1–5.3, 5.6 | [apps/api/CLAUDE.md](apps/api/CLAUDE.md) | when Claude reads a file in `apps/api` |
| 5.4, 5.5, 5.9, 5.10, 6.5, 11.12 | [apps/web/CLAUDE.md](apps/web/CLAUDE.md) | when Claude reads a file in `apps/web` |
| 5.7 | [docs/architecture/auth.md](docs/architecture/auth.md) | on demand |
| 5.8 | [docs/architecture/ugc-moderation.md](docs/architecture/ugc-moderation.md) | on demand |
| 5.11 | [docs/architecture/files.md](docs/architecture/files.md) | on demand |
| 5.12 | [docs/architecture/email.md](docs/architecture/email.md) | on demand |
| 5.13 | [docs/architecture/privacy.md](docs/architecture/privacy.md) | on demand |
| 6.2 | [docs/architecture/cost-control.md](docs/architecture/cost-control.md) | on demand |
| 6.6 | [.claude/rules/compatibility.md](.claude/rules/compatibility.md) | files in `apps/api`, `packages/contracts` |
| 6.7 | [.claude/rules/infra.md](.claude/rules/infra.md) | files in `infra/`, `.github/`, Dockerfiles, compose files |
| 8–10 | [docs/ROADMAP.md](docs/ROADMAP.md) | on demand |
| 11.7–11.9 | [.claude/rules/code.md](.claude/rules/code.md) | `*.ts`, `*.tsx` files |
| 11.10 | [.claude/rules/tests.md](.claude/rules/tests.md) | files in `tests/`, `e2e/`, test configs |
| 11.11 | [.claude/rules/tooling.md](.claude/rules/tooling.md) | `package.json`, workspace and tool configs, `.github/` |

"On demand": the task plan lists the sections the task needs, and Claude reads them before implementation. Files in
`.claude/rules/` are added to the context when Claude reads or edits a file that matches their `paths:` filter.

Rules for later iterations:

| File | Contents | Moves to |
|---|---|---|
| [docs/conventions/pixi.md](docs/conventions/pixi.md) | PixiJS: model and adapter, runtime, events, library documentation | `packages/pixi-charts/CLAUDE.md` in iteration 9 |

## 5. Architecture principles

Sections 5.1–5.13 are in the files listed in section 4.

## 6. Mandatory rules

### 6.1 Security (the repository is public)

- Secrets live only in environment variables and GitHub Environments. Each app and `infra/local` has a `.env.example`
  with keys and comments and without values; a developer copies it to the git-ignored `.env` and fills it in. Docker
  images contain no secrets.
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
- CORS with `credentials: true` — only for the exact origin of the web app (`WEB_ORIGIN` of the api). In development web
  calls the api directly by `VITE_API_URL`, without a Vite proxy: requests are cross-origin as in production, so CORS
  and `credentials: 'include'` errors show up locally.
- Request body limit — 100 KB for JSON by default, separate limits on specific routes.
- Every endpoint with a user resource has a test "another user's ID → 404".

### 6.2 Cost control

In [docs/architecture/cost-control.md](docs/architecture/cost-control.md).

### 6.3 Quality

- Strict tsconfig: the flag list and per-package TypeScript settings — section 11.8.
- ESLint 10 flat config: typescript-eslint `strictTypeChecked`, eslint-plugin-boundaries, a ban on `process.env` outside
  the config module. In `apps/web` — eslint-plugin-react-hooks `recommended` with `exhaustive-deps` as an error.
  Steiger for FSD, Prettier.
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

In [apps/web/CLAUDE.md](apps/web/CLAUDE.md).

### 6.6 Backward compatibility and migrations

In [.claude/rules/compatibility.md](.claude/rules/compatibility.md).

### 6.7 Operations

In [.claude/rules/infra.md](.claude/rules/infra.md).

## 7. Work process

- Every iteration goes through Research → Plan → Implement → Validate.
- A roadmap task runs in one session: Claude writes the plan, the tests, the code and the documents; subagents run only
  at Sergei's request (section 11.5).
- Agree the iteration plan and the plan of each roadmap task with Sergei before implementation. The task plan and its
  status live in `work.local/tasks/<slug>/` (section 11.4).
- Before the work is handed to Sergei, `pnpm verify` passes and Claude reviews `git diff main`: correctness, security,
  the rules of the sections the task touches.
- Record key decisions as ADRs in `docs/adr/`: context, decision, alternatives, consequences.
- At the end of an iteration write a report: what was done, how it was verified, open questions, the next step. Update
  the iteration status in the roadmap.
- Git: Sergei creates commits and PRs and pushes; the rules are in section 11.3.
- Keep CLAUDE.md compact: details go to `docs/`, links stay here. Rules for editing CLAUDE.md — section 11.4.

## 8. Roadmap

In [docs/ROADMAP.md](docs/ROADMAP.md).

## 9. Open questions

In [docs/ROADMAP.md](docs/ROADMAP.md).

## 10. Deferred and excluded

In [docs/ROADMAP.md](docs/ROADMAP.md).

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
- Claude does not merge PRs or push to main: `.claude/hooks/guard-bash.sh` blocks these commands, and branch protection
  blocks direct pushes to main.
- Commit messages: Conventional Commits in English. commitlint checks commits in the `commit-msg` hook. Commit hooks
  are never skipped (`--no-verify`).
- One roadmap task is one branch `task/<slug>` and one PR into main. A task above about 400 changed lines (lockfile and
  generated files excluded) is split into subtasks with separate PRs. PRs are merged by squash merge: the PR title
  becomes the commit message in main, so CI checks the PR title against Conventional Commits.
- Before a new task starts, Claude switches to main, runs `git config remote.origin.prune true` and
  `git pull --ff-only`, then deletes the local branches whose GitHub branch is gone (GitHub deletes the branch of a
  merged PR):

  ```sh
  git for-each-ref --format='%(refname:short) %(upstream:track)' refs/heads |
    awk '$2 == "[gone]" {print $1}' | xargs -r git branch -D
  ```
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
- Rules for files spread across directories live in `.claude/rules/*.md` with a `paths:` filter. Claude Code loads
  such a file when Claude reads or edits a matching file and does not reload it after context compaction. Section 4
  lists the rule files.

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

### 11.7 Architecture and imports, 11.8 Code conventions, 11.9 Comments and JSDoc

In [.claude/rules/code.md](.claude/rules/code.md).

### 11.10 Tests

In [.claude/rules/tests.md](.claude/rules/tests.md).

### 11.11 Tooling

In [.claude/rules/tooling.md](.claude/rules/tooling.md).

### 11.12 Web app conventions

In [apps/web/CLAUDE.md](apps/web/CLAUDE.md).
