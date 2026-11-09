# ADR-0003: Internal packages are JIT

- Status: accepted
- Date: 2026-11-09

## Context

`packages/*` hold code that several applications use: `contracts` (Zod schemas) first, later `ui` and `pixi-charts`.
Their consumers are the api bundle (Rspack, ADR-0002), the web app (Vite), tests (Vitest) and type checking (tsc).

Two strategies:

- **JIT:** `exports` point to `.ts` sources, and every consumer compiles the package together with its own code.
- **Prebuilt:** each package compiles to JavaScript (tsdown, tsup or tsc) and exposes conditional `exports`.

## Decision

- Internal packages are JIT. `exports` in `package.json` map subpaths to `.ts` files in `src/`.
- Packages have no build task and no watch process.
- Package code follows `erasableSyntaxOnly` (CLAUDE.md section 11.8), so any consumer compiles it with type stripping
  only.
- `exports` use no custom conditions. In the prototype (2026-11-09) Rspack, Vitest and tsc resolved the package
  sources without configuration.
- Import specifiers of own files in `packages/*`, `apps/api` and `apps/web` carry the `.ts` or `.tsx` extension. The
  path names the real file; Rspack needs no `extensionAlias`; plain Node 26 loads package sources and `tools/` scripts
  without `tsx` (checked in the prototype). In `apps/web` tsc with `moduleResolution: bundler` resolves `#src/*` only
  with the extension (checked on 2026-11-09). `tsconfig` sets `allowImportingTsExtensions` and `noEmit`. Rejected
  alternative: `.js` specifiers, the TypeScript `nodenext` idiom used in Nest examples; they name a file that exists
  only after compilation.

## Alternatives

- **Prebuilt packages.** Required with a per-file api build (ADR-0002, SWC alternative). Each package gets a build task
  in the Turborepo graph, a watch process in development and conditional `exports` with names consistent across
  `tsconfig`, Node, Vitest and the web build.

## Consequences

- An edit in a package reaches web HMR and the api watch rebuild directly. Go to definition opens the source.
- Every consumer compiles TypeScript. Plain Node loads a package only through the workspace symlink: Node refuses to
  strip types under `node_modules`. Production code never imports a package at runtime; the api runs its bundle.
- Package sources compile under each consumer's `tsconfig`; package code must pass the strictest of them.
- A package cannot be published to npm as is. Publishing is not a goal.
