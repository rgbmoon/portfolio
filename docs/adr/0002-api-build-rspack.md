# ADR-0002: API build with Rspack

- Status: accepted
- Date: 2026-11-09

## Context

NestJS resolves constructor dependencies from the `design:paramtypes` metadata that the TypeScript legacy decorator
transform emits. Without the metadata Nest constructs a class without its dependencies, and the error appears only when
a request reaches the missing dependency. Node 26 type stripping does not support decorators, so `apps/api` needs a
compile step.

The api imports internal workspace packages (`@portfolio/contracts`). The build must work with the production image
layout: `pnpm deploy --prod` copies workspace packages into `node_modules`.

Candidates: SWC compiling each file (`@swc/cli`), and Rspack bundling the api with its built-in `swc-loader`. A
prototype on 2026-11-09 compared them on a Nest 12 app with a JIT `contracts` package (ADR-0003):

| Check | SWC, per file | Rspack, bundle |
|---|---|---|
| Decorator metadata, DI without `@Inject` | works | works |
| Build of the prototype | ~0.1 s | ~0.1 s |
| Watch: edit → new response (rebuild + `node --watch` restart) | ~0.55 s | ~0.55 s |
| Run from `pnpm deploy --prod` output and in `node:26-slim` (read-only, non-root) | fails: `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` | works |
| Run with `contracts` built by `tsc` (`source`/`default` exports) | works | not needed |

SWC leaves `import '@portfolio/contracts/...'` in the output, and Node loads the package `.ts` source at runtime. Node
refuses to strip types from files under `node_modules`. In development the pnpm symlink resolves to
`packages/contracts`, outside `node_modules`, so the failure shows only in the production layout.

## Decision

- Rspack 2 (`@rspack/core`, `@rspack/cli`) bundles `apps/api/src` and `@portfolio/*` packages into one ESM file
  (`output.module`).
- `builtin:swc-loader` compiles TypeScript with `legacyDecorator`, `decoratorMetadata`, `useDefineForClassFields: false`
  and `keepClassNames`.
- Every other bare import is external (`externalsType: 'module-import'`): third-party packages load from `node_modules`
  at runtime.
- Source maps: `devtool: 'source-map'`, the process runs with `node --enable-source-maps`.
- Development: `rspack build --watch` and `node --watch` on the bundle.
- Type checking is a separate `tsc --noEmit` task; Rspack does not check types.
- Nest CLI is not used: neither the build nor the dev mode needs it.

## Alternatives

- **SWC with prebuilt internal packages.** Works in the production layout when each internal package used at runtime
  has its own build task and conditional `exports` (`source` for TypeScript, Vite and Vitest, `default` for Node).
  The condition names must be kept consistent across `tsconfig`, Node, Vitest and the web build. In the prototype
  `node --conditions=source` also redirected the api's own `#src/*` imports to `src/`, where only `.ts` files exist,
  and the start failed, so packages and `#src/*` would need distinct condition names. SWC has a dedicated recipe in the Nest documentation; Rspack is
  mentioned there only as the default builder of Nest CLI monorepo mode.
- **SWC with JIT packages and the whole workspace copied into the image.** Runs while workspace packages stay symlinks
  outside `node_modules`. It breaks at runtime as soon as a package is copied into `node_modules` (`pnpm deploy`,
  `injectWorkspacePackages`), and no build step reports it.
- **tsc.** Emits one file per source file, so it shares the SWC runtime resolution of workspace packages. The Nest
  documentation describes SWC as 10–20 times faster than tsc.

## Consequences

- Internal packages need no build step (ADR-0003). The runtime image contains `dist/main.js` and the production
  dependencies of third-party packages.
- The same choice is the Nest 12 default for Nest CLI monorepo mode: "Rspack can significantly reduce build times and
  produces a single file".
- Third-party packages must stay external. OpenTelemetry auto-instrumentation and Sentry patch modules that Node loads
  from `node_modules`; a bundled copy of Express, `pg` or Prisma would not be instrumented.
- The build transform (SWC inside Rspack) differs from the test transform: Vitest 5 compiles sources with Oxc (Vite 8)
  and emits decorator metadata without plugins. E2E tests on the production build (CLAUDE.md section 11.10) cover the
  difference.
- We maintain `rspack.config.ts` (about 50 lines). `@rspack/binding` adds a native binary of about 40 MB to dev
  dependencies.
- Risk for iteration 5: the generated Prisma client (TypeScript in `src/generated/prisma`) becomes part of the bundle.
  Verify it together with the Prisma setup.
