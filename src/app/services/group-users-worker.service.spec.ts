import { TestBed } from '@angular/core/testing';
import { GroupUsersWorkerService } from './group-users-worker.service';
import { IndexedGroupResult } from '../models/grouping.model';
import {
  WorkerMock,
  setupWorkerMock,
  teardownWorkerMock,
  getOriginalWorkerDescriptor
} from './group-users-worker.test-helpers';

describe('GroupUsersWorkerService', () => {
  let service: GroupUsersWorkerService;
  let workerMock: WorkerMock;
  let workerDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    // Save the existing Worker descriptor and set up mock
    workerDescriptor = getOriginalWorkerDescriptor();
    workerMock = setupWorkerMock();

    TestBed.configureTestingModule({
      providers: [GroupUsersWorkerService]
    });

    service = TestBed.inject(GroupUsersWorkerService);
  });

  afterEach(() => {
    service.ngOnDestroy();
    teardownWorkerMock(workerDescriptor);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize a worker on construction', () => {
    expect(window.Worker).toHaveBeenCalled();
  });

  it('should post a message to the worker when groupUsers is called', (done) => {
    const users = [
      { firstname: 'Alice', lastname: 'Anderson', age: 25 },
      { firstname: 'Bob', lastname: 'Brown', age: 30 }
    ];

    service.groupUsers(users, 'name', 'Alice').subscribe(() => {
      const messages = workerMock.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({
        type: 'group',
        requestId: 1,
        users,
        groupBy: 'name',
        search: 'Alice'
      });
      done();
    });

    // Simulate worker response
    workerMock.simulateResponse({
      requestId: 1,
      groups: [
        { title: 'A', userIndexes: [0, 1], count: 2 }
      ]
    });
  });

  it('should only resend the user array when it changes', () => {
    const users = [{ firstname: 'Alice' }];
    const nextPageUsers = [{ firstname: 'Bob' }];

    service.groupUsers(users, 'name', '').subscribe();
    service.groupUsers(users, 'age', 'Ali').subscribe();
    service.groupUsers(nextPageUsers, 'name', '').subscribe();

    const messages = workerMock.getMessages();
    expect(messages[0].users).toEqual(users);
    // Same array, so the worker reuses the copy it already holds.
    expect(messages[1]).not.toHaveProperty('users');
    expect(messages[2].users).toEqual(nextPageUsers);
  });

  it('should emit grouped results when worker responds', (done) => {
    const users = [{ firstname: 'Alice', age: 25 }];
    const mockGroups: IndexedGroupResult[] = [
      { title: 'A', userIndexes: [0], count: 1 }
    ];

    service.groupUsers(users, 'name', 'Alice').subscribe({
      next: (groups) => {
        expect(groups).toEqual(mockGroups);
        done();
      },
      error: () => {
        fail('Should not error');
        done();
      }
    });

    workerMock.simulateResponse({
      requestId: 1,
      groups: mockGroups
    });
  });

  it('should error the observable if worker errors', (done) => {
    const users = [{ firstname: 'Alice' }];

    service.groupUsers(users, 'name', 'Alice').subscribe({
      next: () => {
        fail('Should not emit value');
      },
      error: (error) => {
        expect(error.message).toContain('Worker error');
        done();
      }
    });

    workerMock.simulateError(new Error('Worker failed'));
  });

  it('should ignore stale responses with mismatched requestIds', (done) => {
    const users = [{ firstname: 'Alice' }];
    const mockGroups: IndexedGroupResult[] = [
      { title: 'A', userIndexes: [0], count: 1 }
    ];

    let completed = false;

    service.groupUsers(users, 'name', 'Alice').subscribe({
      next: (groups) => {
        expect(groups).toEqual(mockGroups);
        completed = true;
      }
    });

    // Simulate a stale response with wrong requestId
    workerMock.simulateResponse({
      requestId: 999, // Wrong ID
      groups: [{ title: 'Z', userIndexes: [0], count: 1 }]
    });

    // Simulate the correct response
    workerMock.simulateResponse({
      requestId: 1, // Correct ID
      groups: mockGroups
    });

    setTimeout(() => {
      expect(completed).toBe(true);
      done();
    }, 50);
  });

  it('should handle multiple concurrent requests', (done) => {
    const users1 = [{ firstname: 'Alice' }];
    const users2 = [{ firstname: 'Bob' }];

    let count = 0;

    service.groupUsers(users1, 'name', 'Alice').subscribe({
      next: (groups) => {
        expect(groups).toEqual([{ title: 'A', userIndexes: [0], count: 1 }]);
        count++;
        if (count === 2) done();
      }
    });

    service.groupUsers(users2, 'name', 'Bob').subscribe({
      next: (groups) => {
        expect(groups).toEqual([{ title: 'B', userIndexes: [0], count: 1 }]);
        count++;
        if (count === 2) done();
      }
    });

    // Respond to first request
    workerMock.simulateResponse({
      requestId: 1,
      groups: [{ title: 'A', userIndexes: [0], count: 1 }]
    });

    // Respond to second request
    workerMock.simulateResponse({
      requestId: 2,
      groups: [{ title: 'B', userIndexes: [0], count: 1 }]
    });
  });

  it('should terminate worker on ngOnDestroy', () => {
    const terminateSpy = jest.spyOn(workerMock, 'terminate');
    service.ngOnDestroy();
    expect(terminateSpy).toHaveBeenCalled();
  });

  it('should handle error response from worker', (done) => {
    const users = [{ firstname: 'Alice' }];

    service.groupUsers(users, 'name', 'Alice').subscribe({
      next: () => {
        fail('Should not emit value');
      },
      error: (error) => {
        expect(error.message).toContain('Worker error: Something went wrong');
        done();
      }
    });

    workerMock.simulateResponse({
      requestId: 1,
      error: { message: 'Something went wrong' }
    });
  });
});
