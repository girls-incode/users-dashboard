import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { UsersService } from './services/users.service';
import { MockResult } from './mock-data';
import { User } from './models/user.model';
import { UserResult } from './models/api-result.model';
import { GroupBy, IndexedGroupResult } from './models/grouping.model';
import { of, throwError } from 'rxjs';

interface GroupRequest {
  type: 'group';
  requestId: number;
  users: User[];
  groupBy: GroupBy;
  search: string;
}

interface WorkerResponse {
  groups: IndexedGroupResult[];
}

class WorkerMock {
  postMessageCalls: GroupRequest[] = [];
  terminateCalls = 0;
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;

  postMessage(message: GroupRequest): void {
    this.postMessageCalls.push(message);
  }

  terminate(): void {
    this.terminateCalls += 1;
  }
}

class UsersServiceMock {
  getUsers = jest.fn(() => of(User.mapFromUserResult(MockResult.results as UserResult[])));
}

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;
  let userServiceMock: UsersServiceMock;
  let workerDescriptor: PropertyDescriptor | undefined;
  const mockUsers = User.mapFromUserResult(MockResult.results as UserResult[]);

  beforeEach(async () => {
    userServiceMock = new UsersServiceMock();
    workerDescriptor = Object.getOwnPropertyDescriptor(window, 'Worker');

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        {
          provide: UsersService,
          useValue: userServiceMock
        }
      ]
    }).compileComponents();
  });

  afterEach(() => {
    if (workerDescriptor) {
      Object.defineProperty(window, 'Worker', workerDescriptor);
    } else {
      Reflect.deleteProperty(window, 'Worker');
    }
  });

  function createWorkerMock(): WorkerMock {
    const workerMock = new WorkerMock();
    const WorkerConstructor = jest.fn((): Worker => workerMock as unknown as Worker);
    Object.defineProperty(window, 'Worker', { configurable: true, value: WorkerConstructor });

    return workerMock;
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should load users on init and send grouping request', () => {
    const workerMock = createWorkerMock();

    component.ngOnInit();

    expect(userServiceMock.getUsers).toHaveBeenCalledWith(1);
    expect(workerMock.postMessageCalls.length).toBeGreaterThan(0);
    expect(workerMock.postMessageCalls[0]).toEqual({
      type: 'group',
      requestId: 1,
      users: mockUsers,
      groupBy: 'name',
      search: ''
    });
    expect(component.isLoading()).toBe(false);
  });

  it('should update selected group and post new grouping request', () => {
    const workerMock = createWorkerMock();

    component.ngOnInit();
    workerMock.postMessageCalls = [];

    component.selectGroup('age');

    expect(component.selectedGroup()).toBe('age');
    expect(workerMock.postMessageCalls.length).toBe(1);
    expect(workerMock.postMessageCalls[0].groupBy).toBe('age');
  });

  it('should apply grouped worker results and finish grouping', () => {
    const workerMock = createWorkerMock();
    component.ngOnInit();

    workerMock.onmessage?.(new MessageEvent<WorkerResponse>('message', {
      data: {
        requestId: workerMock.postMessageCalls[0].requestId,
        groups: [{ title: 'A', count: 1, userIndexes: [0] }]
      }
    }));

    expect(component.isGrouping()).toBe(false);
    expect(component.displayedUserCount()).toBe(1);
    expect(component.groups()).toEqual([
      expect.objectContaining({ title: 'A', count: 1, users: [expect.objectContaining({ firstname: mockUsers[0].firstname })] })
    ]);
  });

  it('ignores stale worker results after a newer grouping request', () => {
    const workerMock = createWorkerMock();
    component.ngOnInit();
    component.selectGroup('age');

    workerMock.onmessage?.(new MessageEvent<WorkerResponse>('message', {
      data: {
        requestId: 1,
        groups: [{ title: 'stale', count: 1, userIndexes: [0] }]
      }
    }));

    expect(component.groups()).toEqual([]);
  });

  it('ignores a worker result from a previous page after pagination starts', () => {
    const workerMock = createWorkerMock();
    component.ngOnInit();
    component.nextPage();

    workerMock.onmessage?.(new MessageEvent<WorkerResponse>('message', {
      data: {
        requestId: 1,
        groups: [{ title: 'stale', count: 1, userIndexes: [0] }]
      }
    }));

    expect(component.groups()).toEqual([]);
  });

  it('ignores a late worker result after a page request fails', () => {
    const workerMock = createWorkerMock();
    component.ngOnInit();
    userServiceMock.getUsers.mockReturnValueOnce(throwError(() => new Error('Network error')));
    component.nextPage();

    workerMock.onmessage?.(new MessageEvent<WorkerResponse>('message', {
      data: {
        requestId: 1,
        groups: [{ title: 'stale', count: 1, userIndexes: [0] }]
      }
    }));

    expect(component.groups()).toEqual([]);
    expect(component.errorMessage()).toBe('Users could not be loaded. Please try again.');
  });

  it('only starts searching at three characters and clears an active search below the threshold', () => {
    jest.useFakeTimers();
    try {
      const workerMock = createWorkerMock();
      component.ngOnInit();
      workerMock.postMessageCalls = [];

      component.searchControl.setValue('Al');
      jest.advanceTimersByTime(220);
      expect(workerMock.postMessageCalls).toHaveLength(0);

      component.searchControl.setValue('Ali');
      jest.advanceTimersByTime(220);
      expect(workerMock.postMessageCalls).toHaveLength(1);
      expect(workerMock.postMessageCalls[0].search).toBe('Ali');

      component.searchControl.setValue('Al');
      jest.advanceTimersByTime(220);
      expect(workerMock.postMessageCalls).toHaveLength(2);
      expect(workerMock.postMessageCalls[1].search).toBe('');
    } finally {
      jest.useRealTimers();
    }
  });

  it('should clear the loading state when loading users fails', () => {
    createWorkerMock();
    userServiceMock.getUsers.mockReturnValueOnce(throwError(() => new Error('Network error')));

    component.ngOnInit();

    expect(component.isLoading()).toBe(false);
    expect(component.isGrouping()).toBe(false);
    expect(component.errorMessage()).toBe('Users could not be loaded. Please try again.');
    expect(component.users()).toEqual([]);
    expect(component.groups()).toEqual([]);
  });

  it('should change page and reload users', () => {
    const workerMock = createWorkerMock();

    component.ngOnInit();
    component.nextPage();

    expect(component.currentPage()).toBe(2);
    expect(userServiceMock.getUsers).toHaveBeenCalledWith(2);

    component.previousPage();
    expect(component.currentPage()).toBe(1);

    component.previousPage();
    expect(userServiceMock.getUsers).toHaveBeenCalledTimes(3);
  });

  it('should terminate the worker on destroy', () => {
    const workerMock = createWorkerMock();

    component.ngOnInit();
    component.ngOnDestroy();

    expect(workerMock.terminateCalls).toBe(1);
  });
});
