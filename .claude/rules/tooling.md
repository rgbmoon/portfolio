---
paths:
  - "**/package.json"
  - "pnpm-workspace.yaml"
  - "**/turbo.json"
  - "eslint.config.ts"
  - "**/tsconfig*.json"
  - ".github/**"
  - ".husky/**"
  - "**/tools/**"
---

# Tooling (CLAUDE.md section 11.11)

- Node scripts run by plain `node`: import specifiers carry `.ts` (section 11.8). A script that imports modules without
  file extensions runs through `tsx`: Node type stripping does not resolve such modules.
- Generated output that is reviewed in a diff or checked by CI is committed: `openapi.json` for oasdiff, precomputed
  data. Code that a Turborepo task generates deterministically from committed sources before typecheck is not
  committed: the Prisma client, the Paraglide output. A manual edit of a generated file is lost on the next run: edit
  the source or the script.
- The TanStack Router route tree `apps/web/src/routeTree.gen.ts` is committed, as the TanStack Router FAQ recommends:
  the Vite plugin regenerates it in `vite dev` and `vite build`, and typecheck rejects a route missing from a stale
  tree. ESLint and Prettier skip the file.
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
