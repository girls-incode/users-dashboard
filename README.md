# Awork user explorer

An Angular user explorer that loads deterministic pages of 5,000 users from randomuser.me, groups and filters them off the main thread in a Web Worker, and renders the result as a single virtualized, expandable list — grouping by name, age, nationality, or country, with local search, pagination, and lazy-loaded per-user details.

## Setup and running

Requires Node.js (Angular 20 / Node 20+) and npm.

```bash
npm install
npm start
```

Open `http://localhost:4200/` once the dev server starts. The app calls `https://randomuser.me/api` directly from the browser — no backend or environment config needed.

### Build

```bash
npm run build
```

Outputs to `dist/awork-challenge`.

### Tests

```bash
npm test              # full suite, once
npm run test:watch    # watch mode
```

Run a single spec:

```bash
npx jest src/app/components/user-list/user-list.component.spec.ts
```

53 specs across 12 suites at the time of writing, all unit/component-level (Jest + jsdom). See [Testing](#testing-and-a-known-gap) below for why there's no browser-level test tier despite `playwright` sitting in `devDependencies`.

## Architecture

- **`AppComponent`** owns page state: the selected grouping, search text, loading/error state, pagination, and the Web Worker's lifecycle.
- **`UserListToolbarComponent`** is presentational — search, grouping, and pagination controls, wired purely through inputs/outputs.
- **`UsersService`** requests 5,000 users per API page and maps the raw API shape to the local `User` model.
- **`workers/group-users.worker.ts`** (backed by the pure, independently-tested functions in `group-users.ts`) does filtering, grouping, and sorting off the main thread, and posts back index arrays rather than cloning 5,000 user objects across the worker boundary.
- **`UserListComponent`** flattens the worker's groups into one virtualized list (see [Virtualizing a list with expandable rows](#virtualizing-a-list-with-expandable-rows) below) — this is where most of this iteration's work landed.
- **`UserItemComponent`** is a presentational, stateless collapsed row: an `expanded` input and a `toggle` output, nothing else.
- **`UserDetailsCardComponent`** + **`UserDetailsService`** render and lazily fetch a user's extended fields (age, gender, username, phone) only once their row is expanded.

## Key decisions and the reasoning behind them

### Virtualizing a list with expandable rows

The list can hold thousands of rows (up to ~5,000 users plus group headers), so virtualization is necessary for scroll performance — but it interacts badly with a naive "expand in place" interaction if you're not careful about how.

**The list is fully flattened, not grouped-then-nested.** `UserListComponent` turns `groups: UserGroup[]` into one flat array of `header | user | details` rows and virtualizes *that* against the actual window scrollbar (not a boxed inner scroll region per group). Nested "cards containing their own mini-scrollboxes" is a common but poor pattern for large grouped lists — it reads as fragmented, and every group ends up needing its own virtualization instance regardless of how small the group is.

**Expanding a row inserts a new row, it never resizes an existing one.** The first version of this feature (elsewhere in this iteration's history) animated a row's own height open/closed via CSS. That fights virtualization: whichever strategy is deciding "what's visible and where" has to already know a row's size to position everything after it, and a value that changes via CSS transition asynchronously desyncs from what the strategy believes. The fix was architectural, not a CSS tweak: expanding a user inserts a sibling `DetailsRow` immediately after it (removed on collapse) — a row's size is fixed for its entire time in the DOM, and only the *array* changes length, which is the case virtualization is built to handle well.

**Virtualization library: `@tanstack/angular-virtual`, not Angular CDK.** This went through a few iterations:
1. Angular CDK's stable `FixedSizeVirtualScrollStrategy` only supports one uniform size for every row — doesn't fit header/user/details rows of different heights.
2. `@angular/cdk-experimental`'s `autosize` strategy supports variable sizes, but estimates total content size from a *running average* item size across everything it's rendered — blending very differently-sized row kinds into one average produced a real, reproducible bug: the page's scrollable height grew or shrank inconsistently when expanding a row near the end of a long list. (The CDK team's own docs describe this strategy as "not ready for production use yet" — this wasn't a one-off issue.)
3. A hand-written custom `VirtualScrollStrategy` (prefix-sum offsets, declared-not-measured sizes) fixed the bug by construction, but was real hand-rolled CDK-internals code for a problem a maintained library already solves.
4. Landed on `@tanstack/angular-virtual` — a maintained, actively-developed library (official Angular binding) with a `estimateSize`/`measureElement` model that supports per-row sizes natively, without CDK's averaging pitfall (TanStack caches each row's *measured* size against its own stable key, not blended into a shared average). Net effect on the codebase: fewer total lines than the hand-rolled strategy, and `@angular/cdk`/`@angular/cdk-experimental` are no longer dependencies at all.

**Declared size seeds the layout, real DOM measurement corrects it.** Each row kind has a best-effort, hand-computed initial height (`estimateSize`), so first paint doesn't jump — but `measureElement` (real `ResizeObserver`-backed measurement, wired via `#virtualItem` refs) self-corrects to whatever a row *actually* renders at, per its own key. Getting the hand-computed numbers exactly right turned out to be genuinely hard (see [Challenges](#challenges) below); making the system self-correcting means a future CSS tweak that drifts the estimate no longer silently clips content or leaves dead space — it just costs one corrected layout pass the first time that row is measured.

### Lazy-loaded, cached user details

`randomuser.me` has no per-user detail endpoint — it's list-only, and every field `UserDetailsCardComponent` shows is already present on the `User` object from the initial list fetch. `UserDetailsService` still models a genuine lazy load rather than just reading the field directly: it defers building the detail view-model until a row is actually expanded, and simulates realistic latency, so the loading-state/caching/subscription-lifecycle plumbing behaves exactly as it would against a real detail endpoint. Results are cached per user id (RxJS `shareReplay`, kept warm after unsubscribe so re-expanding doesn't re-fetch), with the cache bounded (FIFO eviction past 200 distinct entries) so a long session doesn't grow it unboundedly.

`UserDetailsCardComponent` consumes this through `rxResource` (Angular's built-in "reactive input in, async value out" primitive) rather than a hand-rolled `effect()` + manual signals + subscription cleanup — worth flagging that `rxResource` is `@experimental` in this Angular version, a different risk profile than CDK's `autosize` (an Angular-core-owned primitive already recommended in Angular's own docs for this exact pattern, vs. a specific strategy with a known bug) but still not a stable API.

### Signals-first, OnPush everywhere

Every component uses `ChangeDetectionStrategy.OnPush`. Row flattening, expand state, and the virtualizer's options are all `computed()`/signals rather than manually-managed state — `UserListComponent.rows` is deliberately split into a `baseRows` computed (header + user rows, depends only on `groups`) and a `rows` computed (splices in details rows for whoever's expanded), so the common "nothing expanded" state — and collapsing back to it — doesn't re-walk and reallocate the whole list on every click; only an actual expand/collapse does.

RxJS is still used where it earns its place: `HttpClient` responses, the debounced search input, and the simulated detail fetch — the true asynchronous boundaries, not general app state.

## Performance decisions

- Grouping, filtering, and sorting run in a Web Worker, off the UI thread; the worker returns index arrays rather than cloning 5,000 `User` objects back across the boundary.
- Search input is debounced (220ms) and only triggers filtering at 3+ characters, avoiding repeated full-dataset scans while typing.
- The whole list (not per-group) is virtualized against the real window scrollbar — a fixed, small number of DOM nodes regardless of list length.
- `estimateSize` returns each row's real declared size (not a guess needing correction on every scroll), and the virtualizer's own `setRenderedRange`/`setRenderedContentOffset` already no-op on unchanged values, so redundant re-renders during a tiny scroll delta cost nothing extra.
- `baseRows`/`rows` split (above) avoids rebuilding the full row array on every expand/collapse.
- Avatar images use both `loading="lazy"` (skip offscreen fetches) and `decoding="async"` (don't block a paint frame decoding one that does load).
- Worker sorting reuses one `Intl.Collator` per grouping operation instead of reconfiguring locale comparison per pair.
- Request IDs discard stale worker/API results so rapid interactions (fast typing, quick page/group switches) can't let an old response clobber a newer one.

## Testing and a known gap

The suite is unit/component-level (Jest + jsdom): worker logic tested as pure functions, services tested with `HttpTestingController`/`fakeAsync`, components tested via `TestBed` + DOM assertions. `playwright` is a devDependency but has no config or specs — it was reached for during this iteration to visually verify the virtual-scroll/expand-collapse work in a real browser, but this development sandbox has no system libraries for launching Chromium (and no root access to install them), so that verification path was never actually available here. That's a real gap: several rounds of this feature's visual bugs (an animation clipping against a scroll container's `overflow: hidden`, a CSS height computed from the wrong assumed line-height) were found by a human looking at the running app, not by anything in this repo's test suite — jsdom has no real layout engine, so it structurally cannot catch a "the last row of the details card is clipped" class of bug. Setting up an actual Playwright config against `ng serve` (in an environment that can run a browser) is the natural next step if this gap needs closing.

## Challenges

**Getting virtual scrolling correct for a heterogeneous, dynamically-changing list, with no way to see it render.** The list mixes three different row heights, rows are inserted/removed on every expand/collapse, and the one real bug found in this whole effort (CDK `autosize`'s averaging strategy producing an inconsistently-sized scroll area) only showed up when scrolled deep into a long list with something expanded near the boundary — not a case that's obvious from reading the code. All of the diagnosis and fixing for this happened through reasoning about library internals (reading CDK's and TanStack's actual source, not just their docs) plus the user's real-browser reports as the only ground-truth feedback loop, since this environment can't run a browser itself.

**Computing exact pixel heights from a non-obvious CSS cascade, entirely by hand.** The declared-size model needs a real number for each row kind, and the details card's height (padding + 4 text rows + gaps) went through three different values before landing correctly — first assuming a 16px root font-size (it's 14px), then assuming the reset's `line-height: 1` was in effect (a later file in the same stylesheet's own import chain redeclares `line-height: 20px`, same specificity, later in the cascade, so it wins). Both mistakes were "the math is internally consistent, just built on a wrong premise" — the kind of error that's easy to make confidently and hard to catch without a real render to check against. This is exactly the class of bug that real DOM measurement (see above) now makes non-fatal even when it recurs.
