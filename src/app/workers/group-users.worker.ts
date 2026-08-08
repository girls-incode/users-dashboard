import type { UserPayload, WorkerMessage } from '../models/grouping.model';
import { filterUserIndexes, groupUserIndexes, normalizeSearch } from './group-users';

/**
 * The last user set received from the main thread. Grouping and searching both run against the
 * same page of users, so the main thread sends them once per page load and omits them afterwards
 * (see `WorkerMessage.users`) — this holds them between requests.
 */
let cachedUsers: UserPayload[] = [];

/* Worker handler: receive grouping requests from the main thread, filter/search users, group them, then post back the grouped result. */
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  if (event.data?.type !== 'group') {
    return;
  }

  const { requestId, users, groupBy, search } = event.data;

  try {
    if (users) {
      cachedUsers = users;
    }

    // Below 3 characters nothing is filtered out, so skip building an all-indexes array and let
    // groupUserIndexes walk the users directly.
    const filteredIndexes = normalizeSearch(search).length >= 3
      ? filterUserIndexes(cachedUsers, search)
      : undefined;

    self.postMessage({ requestId, groups: groupUserIndexes(cachedUsers, groupBy, filteredIndexes) });
  } catch (error) {
    self.postMessage({
      requestId,
      error: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        groupBy,
        searchLength: search?.length ?? 0
      }
    });
  }
};
