import { Injectable, OnDestroy, inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { LoggerService } from './logger.service';
import type { GroupBy, IndexedGroupResult, UserPayload, WorkerResponseData } from '../models/grouping.model';

/**
 * Owns the grouping Web Worker: creation, message passing, stale-response filtering and teardown.
 *
 * Callers see a plain Observable — `groupUsers()` emits the grouped result once and completes, or
 * errors if the worker fails. Request ids are an internal detail: every request gets one, and a
 * response carrying anything other than the current id is a superseded result and gets dropped, so
 * a slow response can never overwrite a newer one.
 *
 * The user array is only sent when it actually changes (a new page). Grouping and searching the
 * same page reuse the copy the worker already holds, which avoids structured-cloning thousands of
 * user objects on every keystroke.
 */
@Injectable({ providedIn: 'root' })
export class GroupUsersWorkerService implements OnDestroy {
  private readonly logger = inject(LoggerService);
  private worker?: Worker;
  private activeRequestId = 0;
  private lastSentUsers?: UserPayload[];
  private readonly responseSubject = new Subject<{ requestId: number; data: WorkerResponseData }>();

  constructor() {
    this.initializeWorker();
  }

  /**
   * Filters `users` by `search`, then groups the matches by `groupBy`.
   * Emits the grouped indexes once and completes.
   */
  groupUsers(
    users: UserPayload[],
    groupBy: GroupBy,
    search: string
  ): Observable<IndexedGroupResult[]> {
    return new Observable(observer => {
      const requestId = ++this.activeRequestId;

      if (!this.worker) {
        observer.error(new Error('Worker not initialized'));
        return;
      }

      const subscription = this.responseSubject.subscribe({
        next: ({ requestId: responseId, data }) => {
          if (responseId !== requestId) {
            return; // Superseded by a newer request.
          }

          subscription.unsubscribe();

          if (data.error) {
            observer.error(new Error(`Worker error: ${data.error.message}`));
          } else if (data.groups) {
            observer.next(data.groups);
            observer.complete();
          }
        },
        error: (error: unknown) => observer.error(error)
      });

      // The worker caches the last user set it received, so only resend when the page changed.
      const usersChanged = users !== this.lastSentUsers;
      this.lastSentUsers = users;

      this.worker.postMessage({
        type: 'group',
        requestId,
        groupBy,
        search,
        ...(usersChanged && { users })
      });

      return () => subscription.unsubscribe();
    });
  }

  ngOnDestroy(): void {
    this.worker?.terminate();
  }

  private initializeWorker(): void {
    try {
      this.worker = new Worker(new URL('../workers/group-users.worker', import.meta.url), { type: 'module' });

      this.worker.onmessage = ({ data }: MessageEvent<WorkerResponseData>) => {
        this.responseSubject.next({ requestId: data.requestId, data });
      };

      this.worker.onerror = (event: ErrorEvent) => {
        this.responseSubject.error(
          new Error(`Worker error: ${event.error?.message || event.message}`)
        );
        this.worker?.terminate();
        this.worker = undefined;
        this.lastSentUsers = undefined;
      };
    } catch (error) {
      this.logger.error('Failed to initialize the grouping Web Worker', error);
      this.worker = undefined;
    }
  }
}
