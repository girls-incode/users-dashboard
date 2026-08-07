import type { WorkerMessage } from '../models/grouping.model';
import { filterUserIndexes, groupUserIndexes } from './group-users';

/* Worker handler: receive grouping requests from the main thread, filter/search users, group them, then post back the grouped result. */
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  if (event.data?.type !== 'group') {
    return;
  }

  try {
    const filteredIndexes = filterUserIndexes(event.data.users, event.data.search);
    const groups = groupUserIndexes(event.data.users, event.data.groupBy, filteredIndexes);

    self.postMessage({ requestId: event.data.requestId, groups });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    self.postMessage({
      requestId: event.data.requestId,
      error: {
        message: errorMessage,
        stack: errorStack,
        groupBy: event.data.groupBy,
        searchLength: event.data.search?.length ?? 0
      }
    });
  }
};
