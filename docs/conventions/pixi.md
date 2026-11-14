# PixiJS conventions

Rules transferred from Sergei's project pixi-demos for `packages/pixi-charts` and other PixiJS code. They are confirmed
with Sergei and moved into `packages/pixi-charts/CLAUDE.md` in iteration 9. General rules are in the root `CLAUDE.md`
(section 11).

## Model and adapter

- A rendering module with complex behavior is split into a model and an adapter, following headless tables.
- The model imports neither PixiJS nor monorepo packages and computes in abstract units; the unit size comes from
  configuration. The model has no ticker access: the adapter passes the step size by calling `advance` from one ticker
  callback.
- The adapter depends only on the model; `pixi.js` is its peerDependency. The adapter does not draw elements itself:
  view components come from the application through a factory.
- New behavior is a strategy or a model change; the adapter stays unchanged.
- The split brings logic under tests: the model without PixiJS is checked by `advance(deltaMs)` calls in node, without a
  ticker and jsdom.
- A library package exposes its public API through the barrel `src/index.ts`, the only entry in `exports`, and is
  marked `"sideEffects": false`. Inside the package modules import each other directly; otherwise cycles appear. A
  self-contained library package does not depend on shared packages: the utilities it needs live inside it.

## Layers of application PixiJS code

Importing downward is allowed, upward only `import type`.

- `ui/` — what is drawn: a `Container` (or `Text`) subclass with domain methods (`setData`, `show`, `highlight`).
  Switching the implementation (sprite, `Graphics`, texture) requires no controller changes.
- `controllers/` — logic over a view component: subscriptions, data formatting, calls to view methods. A controller
  does not draw.
- `scenes/` — layout: a scene assembles controllers and places them on screen.
- Upward (view → logic) — an event in the past tense. Downward (logic → view) — a direct method call; a method of an
  action with an end (animation, transition) returns a promise, and the caller awaits it.
- An event is emitted at the moment its name states: an event about the end of a motion is emitted after `await` of
  that motion.
- One owner writes each piece of state.
- The coordinating layer imports controllers only as types; tests replace them with doubles, so a whole scenario runs
  without a browser.
- A controller's JSDoc describes its role: what it connects and which API it provides.
- Terminology: a view component is a class from `ui/`, the view layer is `ui/` as a whole, a scene element is any
  object in the scene tree.

## React ↔ PixiJS bridge

- A shared canvas component uses `useRef` and `useEffect` with cleanup; a callback ref without cleanup is not used. The
  component receives the scene through `boot`/`dispose` props and imports no concrete scene.
- Bootstrap has two phases: `preload()` of assets, then construction of the object graph — constructors read the
  asset cache synchronously. The loading overlay is removed when `start` resolves (it waits for the ready event); a
  bootstrap failure throws and raises a fatal error.
- A local `disposed` flag is checked after every `await`: StrictMode mounts the effect twice.

## Assets

- Assets loaded by a string URL at runtime live in `public/`; they are not part of the Vite build graph.
- All URLs of a scene module are listed in its manifest `assets.ts`. The only `Assets.load` call is in the preload
  function, which the module's `preload` calls before the graph is constructed. After that assets are read from the
  cache synchronously; `Assets.load` does not appear inside classes.
- The nesting inside an asset pack is kept: an `.atlas` file references its page by the bare file name.
- Path case is checked against the disk: on case-sensitive serving a typo returns the SPA shell (Caddy `try_files`,
  CLAUDE.md section 5.5) instead of the asset, and PixiJS fails on decoding.
- SVG icons for PixiJS are white: `tint` multiplies the color, so a black source cannot be tinted.

## Errors

- A fatal error means the renderer runtime has stopped; the app shows an overlay above the canvas.
- Error handlers along the render path: the ticker `update`, `webglcontextlost`, the subscription guard of the
  controller base class.

## Runtime

- Initialization is asynchronous (`await app.init(...)`); a `pending` field on the owner guards against the StrictMode
  double mount.
- The canvas CSS size depends on the container size. `ResizeObserver` tracks it; every recalculation calls
  `renderer.resize` and the scene `layout`; `resizeTo` is not used.
- The render resolution cap (`MAX_RESOLUTION`) is a constant; the scene receives the density as an argument of
  `layout`.
- Rendering runs on an own ticker (`app.ticker = ticker`). Functions are added to the ticker by a stable reference;
  otherwise they cannot be removed.
- `destroy` of the own ticker does not call `super.destroy()`: `Application.destroy` destroys plugins before the stage,
  and the `stage.destroy` cascade then calls `ticker.remove`.
- Everything PixiJS does not destroy by cascade (pools, objects outside the scene) is destroyed before `app.destroy`.
- Animation delays use the ticker only (`waitTicks`, `waitUntil`): in a hidden tab the ticker stops, and a timer-based
  animation would finish without a single rendered frame. `setTimeout` is allowed as a wall-clock watchdog and in mocks.
- `Graphics` does not build geometry of zero area or length while visible: PixiJS 8.19 draws a batch with `size = 0` as
  the whole index buffer (`size || length` in `GlGeometrySystem.draw`), and GL rejects the call with
  `INVALID_OPERATION`.
- Objects created in bulk come from a pool: classes take them with `attach` and return them with `detach`; `release`
  fully resets the object state. Re-creating an object per element caused major GC pauses. Code outside the pool
  depends only on the object interface.
- Heavy PixiJS instances are not put into reactive state (Zustand). Data that changes every frame lives in plain
  classes; the render reads it every frame. Reactive state is used where changes are rare and a subscriber exists.
- If the render reuses view components by entity id, the id is unique for the whole model lifetime, including data
  reloads: a reissued id gives a new entity the geometry of another one, and neither typecheck nor model tests detect
  it.
- Decorative animation is enabled only without `prefers-reduced-motion`.
- Interactive view components set `accessiblePointerEvents = 'none'`: the accessibility layer is removed only by mouse
  movement, and on touch devices its DOM buttons would intercept `pointerdown` from the canvas. Keyboard and screen
  readers activate the buttons without it. `select-none` and `-webkit-touch-callout: none` on the canvas disable the
  long-tap menu on iOS.
- The accessibility layer is enabled in every build: without it the canvas buttons are unavailable to screen readers
  and the keyboard; e2e tests locate them through it. Verified in pixi-demos on PixiJS 8.19; re-check in iteration 9:
  - the `accessibilityOptions.enabledByDefault` option has no effect: application initialization removes the
    accessibility system from the `postrender` hook after the option activates it. The host calls
    `app.renderer.accessibility.setAccessibilityEnabled(true)` after `app.init()`;
  - `accessibleChildren = false` on a button also blocks the registration of the button itself: the tree walk stops
    at this flag before it checks the accessibility of the current object.

## Events

- The emitter wraps `eventemitter3`: PixiJS depends on the same library, so the bundle contains one copy, and the
  events module does not import PixiJS.
- All event names are in a typed event map; the compiler checks payloads.
- A payload carries the data of the moment; a subscriber reads current state from the store.
- `on()` returns an unsubscribe function. In async code `on` takes the `signal` of its scope.
- `off(event)` without a callback and `removeAllListeners()` are not called: they remove other subscribers.
  `listenerCounts()` diagnoses leaks.

## Library documentation

Applies to library packages (model + adapter) that can be used without the application.

- Structure follows TanStack Table v8: Introduction → Overview → Quick start → module guides → feature guides → API by
  entity → adapter → examples → Glossary. The API reference lists each entity's public fields and methods with a
  signature and a one- or two-line description.
- The introduction is a brief; minor internal details stay out of it. Its table is "What can be customized" with the
  columns "What / How / Where to look".
- The core of the document is how modules compose and every customization point: configuration, strategies, call
  options, view component factories, layout, a custom adapter.
- The library is separate from the application: integration with a specific application appears only in "Examples"
  with a note; in guides and composition diagrams the application is a "your code" block.
- Editing the core is not presented as a customization method; phrases like "without editing the core" are not written
  either.
- The glossary is at the very end, one term per line. A term with a row in an entity table links to that row
  (`<tr id="obj-…">`); the definition is not duplicated.
- Sections about the internal history of a module ("Extraction into packages") are not needed.
- Before a documentation edit: signatures are checked against the source, a grep checks forbidden words and anchors.
