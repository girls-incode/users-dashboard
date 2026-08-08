import { GroupUsersWorkerService } from './group-users-worker.service';
import { IndexedGroupResult, WorkerResponseData } from '../models/grouping.model';
import { Subject } from 'rxjs';

/**
 * Mock Worker class for testing. Records messages posted and can simulate responses/errors.
 */
export class WorkerMock {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  private messages: any[] = [];

  postMessage(msg: any): void {
    this.messages.push(msg);
  }

  getMessages(): any[] {
    return this.messages;
  }

  simulateResponse(data: WorkerResponseData): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
  }

  simulateError(error: Error): void {
    if (this.onerror) {
      this.onerror(new ErrorEvent('error', { error }));
    }
  }

  terminate(): void {
    // Mock termination
  }
}

/**
 * Sets up the global window.Worker mock and returns the mock instance.
 * Must be paired with teardownWorkerMock in afterEach.
 */
export function setupWorkerMock(): WorkerMock {
  const workerMock = new WorkerMock();
  Object.defineProperty(window, 'Worker', {
    configurable: true,
    writable: true,
    value: jest.fn(() => workerMock)
  });
  return workerMock;
}

/**
 * Restores the original window.Worker or deletes it if it didn't exist.
 * Must be paired with setupWorkerMock in beforeEach.
 */
export function teardownWorkerMock(workerDescriptor?: PropertyDescriptor): void {
  if (workerDescriptor) {
    Object.defineProperty(window, 'Worker', workerDescriptor);
  } else {
    Reflect.deleteProperty(window, 'Worker');
  }
}

/**
 * Gets the original Worker property descriptor before mocking.
 * Call this in beforeEach and pass the result to teardownWorkerMock in afterEach.
 */
export function getOriginalWorkerDescriptor(): PropertyDescriptor | undefined {
  return Object.getOwnPropertyDescriptor(window, 'Worker');
}

/**
 * Mock for GroupUsersWorkerService to use in component tests.
 * Provides a Subject-based interface for simulating async responses.
 */
export class GroupUsersWorkerServiceMock {
  groupUsersSubject = new Subject<IndexedGroupResult[]>();
  groupUsers = jest.fn(() => this.groupUsersSubject.asObservable());
  ngOnDestroy = jest.fn();
}
