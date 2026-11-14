---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# Code rules (CLAUDE.md sections 11.7–11.9)

## 11.7 Architecture and imports

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

## 11.8 Code conventions

**File layout:**
- The split rules of this item apply only to code with classes. A class file `<name>.ts` holds one class and nothing
  else: no free functions, types, constants or singletons. The types, constants, utilities and DI tokens of a layer
  with classes live in `types.ts`, `constants.ts`, `utils.ts`, `tokens.ts`. A `utils/` folder appears when `utils.ts`
  grows and splits by topic; imports address files directly, the folder has no barrel.
- Code without classes (tool configs, config factories, function modules) follows the layout of the official examples
  of the library in use. If the layout is not obvious, ask Sergei.
- No empty placeholder files; no module-scope singletons (the exception is the entry point).
- `index.ts` exists only as the public API of an FSD slice and of an api module; inside them, imports address files.
  Packages expose their API through `exports` in `package.json`, one explicit entry per public file
  (`"./health": "./src/health.ts"`); files without an entry stay internal. Internal packages are JIT: `exports` point
  to `.ts` sources, and every consumer compiles them; packages have no build step (ADR-0003).
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
- Import specifiers of own files carry the `.ts` or `.tsx` extension (`#src/app.module.ts`, `./status.ts`): the path
  names the real file, and Node loads package sources and `tools/` scripts directly. In `apps/web` TypeScript resolves
  `#src/*` only with the extension: `moduleResolution: bundler` does not add extensions to `imports` targets. Their
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
- Manual memoization in `apps/web`: React Compiler memoizes components and hooks (section 11.12).
- Types, constants and free functions in a class file.

## 11.9 Comments and JSDoc

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

