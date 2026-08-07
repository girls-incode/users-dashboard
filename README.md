# Awork user explorer

An Angular user explorer that loads deterministic pages from randomuser.me, groups users in a Web Worker, and provides local name search, grouping controls, pagination, and expandable user cards.

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:4200/` after the development server starts.

## Build and test

```bash
npm test
npm run build
```

Run one spec file with:

```bash
npx jest src/app/workers/group-users.spec.ts --runInBand
```

## Architecture

- `AppComponent` owns page state, the selected grouping, search state, loading/error state, and the worker lifecycle.
- `UserListToolbarComponent` is presentational. It contains search, grouping, and pagination controls and communicates through inputs and outputs.
- `UserListComponent` renders the worker’s groups and uses stable group/user tracking keys.
- `UserItemComponent` is an OnPush expandable card. The expansion is local to each item and does not trigger a reload.
- `UsersService` requests 5,000 users per API page and maps API responses to the local `User` model.
- `workers/group-users.worker.ts` performs filtering and grouping off the main thread. The pure functions in `group-users.ts` are independently tested.

## Grouping and search

The available groupings are name, age, nationality, and country. Adding another category only requires extending the `GroupBy` union and the worker’s grouping switch.

Search is local and never calls the API. It is debounced and starts filtering after three non-whitespace characters. Clearing or shortening an active search below three characters restores the complete current page.

## Performance decisions

- The worker keeps filtering, grouping, and sorting away from the UI thread.
- Search input is debounced to avoid repeatedly cloning and processing 5,000 users while typing.
- Angular OnPush change detection and signal-based state limit UI updates to changed state.
- `@for` uses group titles and UUIDs (with an index fallback for incomplete records) to minimize DOM reconciliation.
- The API returns 5,000 users per page, satisfying the requested page size. Pagination is included as a bonus and prevents unnecessarily keeping multiple 5,000-user result sets in the UI at once.
- Worker sorting reuses one `Intl.Collator` per grouping operation rather than configuring locale comparison inside every comparison.
- Worker responses contain group membership indexes instead of cloning all user objects back to the main thread; request IDs discard stale results during rapid interactions.

Race and edge-case behavior is covered by tests: stale results from an old grouping or page are ignored, late worker results cannot restore data after an API failure, short searches do not trigger filtering, and shortening an active search clears it back to the full page.

## UX and resilience

Users see a loading state while data is fetched or grouped, a clear empty state for searches with no matches, and an accessible error message when the API or worker fails. Cards expand in place to show age, gender, username, and phone details.
