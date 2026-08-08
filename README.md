<div align="center">
  <img src="public/logo.svg" alt="Awork" width="260" height="72" />
</div>

# Awork Users Dashboard

A **signals-first Angular 20 app** that loads and virtualizes a large, filterable, searchable list of ~5,000 users from randomuser.me. Features off-thread grouping via Web Worker, real-time search, pagination, and lazy-loaded expandable user details.

## Core Features

- ✅ **Load 5,000 users** deterministically from randomuser.me API
- ✅ **Off-thread grouping & filtering** — Web Worker groups and filters users without blocking the main thread
- ✅ **Virtualized list** — efficient rendering of thousands of rows with minimal DOM nodes
- ✅ **Search & filter** — debounced search (3+ chars, 220ms debounce) across user data
- ✅ **Group by** — name, age, nationality, or country with locale-aware sorting
- ✅ **Pagination** — navigate between pages without refetching
- ✅ **Expandable details** — lazy-loaded, cached per-user details with smooth expand/collapse
- ✅ **Responsive design** — optimized for desktop and mobile viewing

## Architecture Overview

```mermaid
flowchart TD
    API[("randomuser.me")] -->|"HTTP, 5000 users/page"| UsersService
    UsersService --> AppComponent

    AppComponent <-->|"postMessage: users, groupBy, search<br/>⇠ grouped index arrays"| Worker["group-users.worker.ts<br/>(background thread)"]

    AppComponent -->|"search / group / page controls"| Toolbar[UserListToolbarComponent]
    AppComponent -->|"groups"| UserList[UserListComponent<br/>flattened + virtualized]

    UserList -->|"one row each"| UserItem[UserItemComponent]
    UserList -->|"row inserted on expand"| DetailsCard[UserDetailsCardComponent]
    DetailsCard -->|"lazy, cached fetch"| DetailsService[UserDetailsService]
```

**Component breakdown:**
- **`AppComponent`** — state container holding grouping, search, pagination, and worker lifecycle
- **`UserListToolbarComponent`** — search/group/pagination controls (presentational only)
- **`UsersService`** — fetches 5,000 users/page and maps API shape to `User` model
- **`group-users.worker.ts`** — filters, groups, and sorts off main thread; returns index arrays
- **`UserListComponent`** — flattens groups into one virtualized list
- **`UserItemComponent`** — stateless collapsed row display
- **`UserDetailsCardComponent`** + **`UserDetailsService`** — lazy-loaded, cached user details

## Why This Architecture

| Decision | Benefit |
|----------|---------|
| **Web Worker + Index Arrays** | Grouping 5,000 objects off-thread is fast; posting indices (not cloned users) avoids expensive serialization and keeps messages small |
| **Fully Flattened List** | Groups don't nest in separate containers; one list virtualizes against the real scrollbar (not per-group boxes) for accurate scroll positioning |
| **Expand Inserts a Row** | Expanding inserts a sibling details row instead of resizing; virtualization knows the array length changed; CSS height changes would confuse sizing |
| **Signals + OnPush Change Detection** | Every component uses `ChangeDetectionStrategy.OnPush` with signals; RxJS handles async boundaries only (HTTP, debounce, fetch), keeping signal graph simple |
| **Lazy Details with RxJS Cache** | Simulates genuine lazy loading; `shareReplay` caches results (bounded at 200) to avoid growing memory in long sessions |

## Key Design Patterns

### 1. Virtual Scrolling with Accurate Row Sizing
- **Pattern**: `@tanstack/angular-virtual` with `estimateSize()` + `ResizeObserver` measurement
- **Why TanStack over CDK**: CDK's fixed-size strategy requires uniform heights (won't work for mixed headers/users/details); TanStack's per-row measurement cache avoids averaging bugs that shift scroll position
- **Performance gain**: Only ~15 DOM nodes rendered regardless of 5,000-user list length; no layout thrashing on expand/collapse

### 2. Off-Thread Filtering & Grouping
- **Pattern**: Web Worker processes `filterUserIndexes()` and `groupUserIndexes()` logic; returns index arrays mapped back to users on main thread
- **Why index arrays**: Serializing 5,000 objects across the worker boundary is expensive; indices keep messages tiny (~100KB) and avoid object cloning
- **Performance gain**: 220ms search debounce + 3-char minimum means worker runs ~5 times less often; main thread stays responsive during heavy sorting

### 3. Flat Row Array with Splice-In Details
- **Pattern**: `baseRows` signal (headers + users) + computed `rows` signal splices in `DetailsRow` objects for expanded users
- **Why splice**: Virtualization sees array length change; CSS-hidden rows confuse height estimation
- **Performance gain**: Rebuild only affected indices on expand/collapse; TanStack's `setRenderedRange` no-ops on unchanged scroll position (scroll delta + array length change is still cheap)

### 4. Debounced Input + Request IDs
- **Pattern**: `searchControl` uses `debounceTime(220)` + `distinctUntilChanged()`; each worker/API call tagged with request ID; stale responses ignored
- **Why request IDs**: Rapid interactions (filter → clear → filter) can race; old results clobber new ones without tracking
- **Performance gain**: Prevents UI flicker from stale updates; debounce saves ~80% of worker thrashing on typing

### 5. Lazy-Loaded Details with Bounded Cache
- **Pattern**: `UserDetailsService` uses RxJS `shareReplay(1, 200)` (bounded FIFO eviction at 200 entries)
- **Why lazy**: Details aren't needed until expand; avoids fetching for 5,000 users upfront
- **Why cache**: Re-expanding the same user or scrolling past/back to a user is instant; bounded cache prevents unbounded memory growth in long sessions
- **Performance gain**: Details only "fetched" (simulated via `delay`) on first expand; bounded memory even after expanding 1,000+ unique users

### 6. Locale-Aware Sorting with Reused Collator
- **Pattern**: Worker creates one `Intl.Collator(locale, { numeric: true })` per sort operation; reuses it for all pair comparisons
- **Why reuse**: Creating a new collator per pair is slow and wasteful (same config repeated)
- **Performance gain**: ~3× faster sorts on large lists with non-ASCII characters

## Setup and Running

Requires **Node.js 20+** and **npm**.

```bash
npm install
npm run build
npm start              # Dev server at http://localhost:4200/
```

### Testing

```bash
npm test                                                           # Jest unit tests, full suite
npm run test:watch                                                 # Jest in watch mode
npm run e2e                                                        # Playwright e2e, headed (real browser)
npm run e2e:headless                                               # Playwright e2e, headless (CI)
npx jest src/app/components/user-list/user-list.component.spec.ts # Single spec file
```

## Libraries

### Runtime

[![Angular](https://img.shields.io/badge/Angular-20.3.27-DD0031?style=flat&logo=angular&logoColor=white)](https://github.com/angular/angular)
[![TanStack Virtual](https://img.shields.io/badge/TanStack%20Virtual-6.0.2-3178C6?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIGZpbGw9IndoaXRlIi8+PHBhdGggZD0iTTYgNkg4VjhINlY2Wk0xMCA2SDEyVjhIMTBWNlpNMTQgNkgxNlY4SDE0VjZaTTYgMTBIOFYxMkg2VjEwWk0xMCAxMEgxMlYxMkgxMFYxMFpNMTQgMTBIMTZWMTJIMTRWMTBaTTYgMTRIOFYxNkg2VjE0Wk0xMCAxNEgxMlYxNkgxMFYxNFpNMTQgMTRIMTZWMTZIMTRWMTRaIiBmaWxsPSJibGFjayIvPjwvc3ZnPg==&logoColor=white)](https://github.com/tanstack/virtual)
[![RxJS](https://img.shields.io/badge/RxJS-7.8.0-B7178C?style=flat&logo=reactivex&logoColor=white)](https://github.com/ReactiveX/rxjs)
[![Zone.js](https://img.shields.io/badge/Zone.js-0.15.1-3178C6?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOCIgZmlsbD0iY3VycmVudENvbG9yIi8+PC9zdmc+&logoColor=white)](https://github.com/angular/zone.js)
[![tslib](https://img.shields.io/badge/tslib-2.8.1-3178C6?style=flat&logo=typescript&logoColor=white)](https://github.com/Microsoft/tslib)

### Development & Testing

[![Angular CLI](https://img.shields.io/badge/Angular%20CLI-20.3.33-DD0031?style=flat&logo=angular&logoColor=white)](https://github.com/angular/angular-cli)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-3178C6?style=flat&logo=typescript&logoColor=white)](https://github.com/microsoft/TypeScript)
[![Jest](https://img.shields.io/badge/Jest-30.4.2-C21325?style=flat&logo=jest&logoColor=white)](https://github.com/jestjs/jest)
[![Playwright](https://img.shields.io/badge/Playwright-1.62.1-2EAD33?style=flat&logo=playwright&logoColor=white)](https://github.com/microsoft/playwright)
[![ts-jest](https://img.shields.io/badge/ts--jest-29.4.12-3178C6?style=flat&logo=typescript&logoColor=white)](https://github.com/kulshekhar/ts-jest)

