# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **📖 User Documentation**: See `README.md` for a comprehensive, badge-style library reference, core features, architecture overview, and design patterns explanation aimed at users and contributors.

## Documentation Structure

This repo has two complementary docs:
- **README.md** — User & contributor-facing guide with feature list, architecture diagrams, design patterns, and badge-style library dependencies
- **CLAUDE.md** — Developer implementation guide with detailed patterns, testing strategy, and code-level details for working on the codebase

## Common Commands

**Development**
- `npm start` — Run the dev server at `http://localhost:4200/` (with polling for WSL)
- `npm run build` — Production build to `dist/`

**Testing**
- `npm test` — Jest unit tests, full suite once
- `npm run test:watch` — Jest in watch mode
- `npx jest src/app/components/user-list/user-list.component.spec.ts` — Single spec file
- `npm run e2e` — Playwright tests in headed mode (real browser)
- `npm run e2e:headless` — Playwright tests headless (CI mode)

## Architecture Overview

This is a **signals-first Angular 20 app** that loads and virtualizes a large, filterable, searchable list of ~5,000 users. Key architectural concepts:

### Main Flow: `AppComponent` → Web Worker → Components

1. **`AppComponent` (state container)**
   - Holds all app state as signals: `users`, `groups`, `isLoading`, `selectedGroup`, `search`, `currentPage`
   - Delegates the Web Worker lifecycle to `GroupUsersWorkerService` and forwards grouping requests
   - Bridges the `search` signal to RxJS via `toObservable()` for debouncing (220ms, 3+ chars to filter)
   - Handles API errors and worker errors with a global error message

2. **`UsersService`**
   - Fetches one page of 5,000 deterministic users from `randomuser.me`
   - Maps raw API shape to `User` model
   - Called on page load and navigation

3. **`group-users.worker.ts` (off-main-thread)**
   - Receives a message with search text and grouping strategy; the user array is only sent when it
     changes (a new page), and cached in the worker between requests
   - Runs `filterUserIndexes()` (search) and `groupUserIndexes()` (group/sort)
   - Posts back *index arrays* (not cloned user objects) to avoid expensive serialization
   - `AppComponent` maps indices back to users on receipt

4. **`UserListComponent`**
   - Flattens `groups: UserGroup[]` into one `rows` computed: `[header, user, details?, header, user, ...]`
   - `baseRows` (computed) holds headers + users and depends only on `groups`; `rows` (computed) splices in a `details` row after each expanded user, and returns `baseRows` untouched when nothing is expanded
   - Virtualizes the flat array against the real window scrollbar using `@tanstack/angular-virtual`
   - Each row has an estimated size (`estimateSize` callback); `ResizeObserver` measures real sizes and corrects estimates

5. **`UserItemComponent` + `UserDetailsCardComponent`**
   - `UserItemComponent` — stateless collapsed row; the whole card is clickable and emits `toggle` (there is no separate expand button)
   - `UserDetailsCardComponent` — lazy-loaded details, cached per user, consumed via `rxResource`

### Why This Architecture

- **Web Worker + Index Arrays**: Grouping/filtering 5,000 objects off-thread is fast; posting indices instead of cloned users avoids expensive serialization and keeps the response small.
- **Cached, Slim Worker Payload**: The request side is optimised too. The worker keeps the last user array it received, so re-grouping/re-searching sends only `{ groupBy, search }`; users are resent only when the page changes. What is sent is a five-field projection (`UserPayload`), not whole `User` objects.
- **Fully Flattened List**: Grouping doesn't nest `<div>` containers per group; the whole list virtualizes against the real scrollbar, not per-group boxes.
- **Expand Inserts a Row**: Expanding doesn't resize a row via CSS animation; it inserts a sibling `details` row and removes it on collapse. Virtualization knows the array's length changed; hidden row-size changes confuse it.
- **The List Is Never Unmounted to Show Progress**: Re-grouping dims the mounted list rather than swapping it for a spinner. `@if` would destroy the virtualizer, its measured row sizes and the expanded-row set, and collapse the page height so the window scroll resets on every search.
- **Signals + OnPush**: Every component uses `ChangeDetectionStrategy.OnPush` with signals for state. RxJS handles *async boundaries* only (HTTP, debounced input, simulated lazy fetch), not general state.

## Key Design Patterns

### Virtualization Strategy

`@tanstack/angular-virtual` (not Angular CDK or hand-rolled) because:
- CDK's `FixedSizeVirtualScrollStrategy` requires uniform row height (doesn't fit headers, users, detail cards of different sizes).
- CDK's experimental `autosize` averages row heights and produces inconsistent scroll-area bugs when expanding rows near list end.
- TanStack's `estimateSize` + `measureElement` cache per-row measured sizes; no averaging, so expanding one row doesn't shift others.

**Size Estimation Pattern**:
- `estimateSize(index)` returns a pre-computed best-effort height (so first paint doesn't jump).
- `measureElement(el)` (via `ResizeObserver` on `#virtualItem` template refs) measures real size and caches it against the row key.
- CSS changes that drift the estimate cost one corrected layout; they don't silently clip or leave gaps.

### Search & Grouping

- Search is **debounced 220ms** and **only filters at 3+ characters** to avoid rapid worker thrashing. Below the threshold the search is treated as empty rather than as a literal short prefix.
- `GroupUsersWorkerService` tags every request with an incrementing ID and drops responses that don't match the current one, so rapid interactions can't let old results clobber new ones. Callers never see request IDs — they get a plain `Observable` that emits once.
- Sorting uses a **single module-level `Intl.Collator`** (`{ numeric: true, sensitivity: 'base' }`), shared across every comparison in every grouping operation — not one per sort, and certainly not one per pair.

### Lazy-Loaded User Details

- `randomuser.me` has no per-user endpoint; all detail fields arrive in the initial list fetch.
- `UserDetailsService` **models a genuine lazy load**: defers building the detail view until expand, simulates latency.
- Results cached via `shareReplay({ bufferSize: 1, refCount: false })` in a `Map` bounded at 200 entries (FIFO eviction) so long sessions don't grow it unboundedly. `refCount: false` is what keeps a result warm after all subscribers unsubscribe, so collapsing and re-expanding doesn't re-fetch.
- Users with no stable id are **not** cached — a placeholder key would make them all share one entry and receive the first user's details.
- `UserDetailsCardComponent` consumes via `rxResource` (@experimental in Angular 20) rather than hand-rolled effects + manual subscription cleanup. Because the card is mounted only while its row is expanded, construction *is* the load trigger.

### Signals vs. RxJS

- **Signals** — component state, UI toggles, expanded rows, search input, grouping strategy. The app has no dependency on `@angular/forms`; the search box is a plain signal bridged to the toolbar with `model()`.
- **RxJS** — only at async boundaries: `HttpClient`, debounced search input (via `toObservable()`), simulated detail fetch, `shareReplay` caching.
- This keeps the signal graph simple and RxJS concerns scoped to I/O.

## Testing

Two-tier approach: Jest (unit/component) + Playwright (e2e).

### Jest
- `jest.config.js` ignores `e2e/` so Playwright specs don't run in jsdom.
- Setup file: `setup-jest.ts`.
- Shared mocks and factories live in `testing.helpers.ts` (`createMockUser()`, `UsersServiceMock`, `GroupUsersWorkerServiceMock`); Web Worker mocking lives in `services/group-users-worker.test-helpers.ts`.
- Component specs test inputs/outputs, expanded/collapsed state, and virtualization rendering logic.
- jsdom can't run layout, so CSS-related bugs (overflow clipping, line-height assumptions) only show up in real browsers.

### Playwright
- `e2e/app.spec.ts` tests main flows: load, group by name/age/country, search, expand/collapse with lazy details, pagination, error states.
- Intercepts `randomuser.me` and serves the repo's `MockResult` fixture (`src/app/mock-data.ts`) instead, so tests are fast and deterministic.
- Drives a real browser against the auto-started dev server; catches layout and timing bugs jsdom misses.

## Dependency Notes

**Runtime**
- `@angular/core@20` — signals (stable in 20), `rxResource` (@experimental), `OnPush` everywhere.
- `@tanstack/angular-virtual@^6` — virtualization library (see virtualization strategy above).
- `rxjs@7.8` — scoped to async boundaries only (HTTP, debounce, caching).

**Deliberately absent** — don't reintroduce these without a real need:
- `@angular/forms` — the search box is a `signal` in `AppComponent` bridged to the toolbar with `model()`. Reaching for `FormControl` for a single input pulls the whole package back in.
- `@angular/router` — the app is a single view with no routes or outlet.
- `@angular/animations` — an optional peer of `platform-browser`; nothing imports it.

**Development**
- `typescript@5.9.2` — strict mode, strict null checks.
- `jest@^30 + jest-preset-angular@^17` — unit testing framework configured for Angular.
- `@playwright/test@^1.62` — e2e testing, real browser automation.

## Important Implementation Details

### Exact Pixel Heights

The virtualization strategy relies on accurate row height estimates. The detail card's height (padding + 4 text rows + gaps) took multiple iterations to get right:
- Root font-size is 14px, not 16px.
- A later CSS file redeclares `line-height: 20px` with the same specificity, overriding an earlier `line-height: 1`.
- Hand-computed estimates are easy to get confidently wrong without a real render to check against.
- `ResizeObserver` measurement (via `measureElement`) self-corrects, so a future CSS tweak costs one layout pass, not silent bugs.

### Error Boundaries

Errors surface in `AppComponent`:
- API fetch failures → `isLoading` signal set to false, `groups` cleared, error message displayed.
- Worker errors → `isGrouping` set to false, `groups` cleared, error message displayed (logged with context: page, search, grouping strategy).
- Worker runtime exceptions → caught and posted back as error responses (with stack trace) so stale request IDs don't hang the UI.

**One logger call per failure.** `httpErrorInterceptor` already logs every failed request with status/method/URL, so `UsersService` deliberately does *not* catch-and-log — it lets errors propagate and `AppComponent` adds the app-level context. Adding a `catchError` back into the service would make a single network failure log three times.

`LoggerService` exposes only `error()`. `warn()`/`info()` were removed as unused; add them back when something actually calls them.

### Cancellation

Both async paths store their `Subscription` and unsubscribe before starting the next one (`usersRequest`, `groupingRequest`), plus in `ngOnDestroy`:
- Superseded grouping requests never emit — the service drops stale responses — so without unsubscribing they would accumulate one dead subscription per keystroke.
- `updateGroups()`'s empty-users early return must cancel and reset `isGrouping` too, otherwise a response for the *previous* page lands afterwards and repopulates the groups that were just cleared.

### Performance Notes

- Avatars use `loading="lazy"` (skip offscreen fetches) and `decoding="async"` (async image decode, don't block paint).
- `baseRows` + `rows` split avoids rebuilding the full array on every expand/collapse.
- TanStack's `setRenderedRange` / `setRenderedContentOffset` no-op on unchanged values, so small scroll deltas cost nothing.
- The worker payload is a `computed`, so the five-field projection is built once per page rather than per request — and its stable array reference is what lets `GroupUsersWorkerService` decide, by identity, whether the users need resending at all.
- Re-grouping keeps the list mounted (see `showSpinner`), preserving the virtualizer's measured row sizes and the window scroll position.

## File Structure

```
src/app/
├── app.component.ts                      # State container, page/search/group logic
├── app.config.ts                         # HTTP client, interceptor, global error handler
├── testing.helpers.ts                    # createMockUser(), UsersServiceMock, worker service mock
├── models/
│   ├── user.model.ts                     # User shape, mapFromUserResult()
│   ├── grouping.model.ts                 # UserGroup, GroupBy, UserPayload, WorkerMessage types
│   └── api-result.model.ts               # API response shape
├── services/
│   ├── users.service.ts                  # Fetch 5,000 users/page
│   ├── group-users-worker.service.ts     # Owns the Web Worker + stale-response filtering
│   ├── user-details.service.ts           # Lazy details with caching
│   ├── logger.service.ts                 # Error logging
│   └── global-error-handler.service.ts   # Global error handler
├── components/
│   ├── user-list/                        # Flatten groups → virtualized rows
│   ├── user-item/                        # Collapsed row
│   ├── user-details-card/                # Lazy-loaded details via rxResource
│   └── user-list-toolbar/                # Search/group/pagination controls
├── workers/
│   ├── group-users.worker.ts             # Entry point, message handler, caches the user array
│   ├── group-users.ts                    # filterUserIndexes(), groupUserIndexes()
│   └── group-users.spec.ts               # Worker logic tests
└── interceptors/                         # HTTP error logging

public/logo.svg                           # Awork logo (project root, displayed in README header)
e2e/app.spec.ts                           # Playwright end-to-end tests
```

The app has no router: `app.routes.ts` and `provideRouter` were removed, along with `@angular/router`,
`@angular/forms` and `@angular/animations`, none of which the app imports.
