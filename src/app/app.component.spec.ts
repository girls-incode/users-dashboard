import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { GroupUsersWorkerService } from './services/group-users-worker.service';
import { UsersService } from './services/users.service';
import { User } from './models/user.model';
import { UserResult } from './models/api-result.model';
import { throwError, of } from 'rxjs';
import { UsersServiceMock, GroupUsersWorkerServiceMock } from './testing.helpers';
import { MockResult } from './mock-data';
import { IndexedGroupResult } from './models/grouping.model';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;
  let userServiceMock: UsersServiceMock;
  let workerServiceMock: GroupUsersWorkerServiceMock;
  const mockUsers = User.mapFromUserResult(MockResult.results as UserResult[]);

  beforeEach(async () => {
    userServiceMock = new UsersServiceMock();
    workerServiceMock = new GroupUsersWorkerServiceMock();

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        {
          provide: UsersService,
          useValue: userServiceMock
        },
        {
          provide: GroupUsersWorkerService,
          useValue: workerServiceMock
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should load users on init and request grouping', () => {
    component.ngOnInit();

    expect(userServiceMock.getUsers).toHaveBeenCalledWith(1);
    expect(workerServiceMock.groupUsers).toHaveBeenCalledWith(
      mockUsers,
      'name',
      ''
    );
    expect(component.isLoading()).toBe(false);
  });

  it('should update selected group and request new grouping', () => {
    component.ngOnInit();
    workerServiceMock.groupUsers.mockClear();

    component.selectGroup('age');

    expect(component.selectedGroup()).toBe('age');
    expect(workerServiceMock.groupUsers).toHaveBeenCalledWith(
      mockUsers,
      'age',
      ''
    );
  });

  it('should apply grouped worker results and finish grouping', () => {
    component.ngOnInit();

    const mockGroups: IndexedGroupResult[] = [
      { title: 'A', count: 1, userIndexes: [0] }
    ];
    workerServiceMock.groupUsersSubject.next(mockGroups);

    expect(component.isGrouping()).toBe(false);
    expect(component.displayedUserCount()).toBe(1);
    expect(component.groups()).toEqual([
      expect.objectContaining({
        title: 'A',
        count: 1,
        users: [expect.objectContaining({ firstname: mockUsers[0].firstname })]
      })
    ]);
  });

  it('should handle grouping errors from the service', () => {
    component.ngOnInit();

    const error = new Error('Grouping failed');
    workerServiceMock.groupUsersSubject.error(error);

    expect(component.isGrouping()).toBe(false);
    expect(component.groups()).toEqual([]);
    expect(component.errorMessage()).toBe('Users could not be grouped. Please try again.');
  });

  it('should request new grouping when search changes at 3+ characters', () => {
    jest.useFakeTimers();
    try {
      // detectChanges (rather than a manual ngOnInit) so the toObservable effect flushes —
      // it also runs ngOnInit, so calling both would load users twice.
      fixture.detectChanges();
      workerServiceMock.groupUsers.mockClear();

      // `toObservable` is effect-backed, so each set needs an effect flush to reach the pipe.
      component.search.set('Al');
      fixture.detectChanges();
      jest.advanceTimersByTime(220);
      expect(workerServiceMock.groupUsers).not.toHaveBeenCalled();

      component.search.set('Ali');
      fixture.detectChanges();
      jest.advanceTimersByTime(220);
      expect(workerServiceMock.groupUsers).toHaveBeenCalledWith(
        mockUsers,
        'name',
        'Ali'
      );

      component.search.set('Al');
      fixture.detectChanges();
      jest.advanceTimersByTime(220);
      expect(workerServiceMock.groupUsers).toHaveBeenLastCalledWith(
        mockUsers,
        'name',
        ''
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('should clear the loading state when loading users fails', () => {
    userServiceMock.getUsers.mockReturnValueOnce(throwError(() => new Error('Network error')));

    component.ngOnInit();

    expect(component.isLoading()).toBe(false);
    expect(component.isGrouping()).toBe(false);
    expect(component.errorMessage()).toBe('Users could not be loaded. Please try again.');
    expect(component.users()).toEqual([]);
    expect(component.groups()).toEqual([]);
  });

  it('should change page and reload users', () => {
    component.ngOnInit();
    component.nextPage();

    expect(component.currentPage()).toBe(2);
    expect(userServiceMock.getUsers).toHaveBeenCalledWith(2);

    component.previousPage();
    expect(component.currentPage()).toBe(1);

    component.previousPage();
    expect(userServiceMock.getUsers).toHaveBeenCalledTimes(3);
  });

  it('should trigger grouping when loading new page', () => {
    component.ngOnInit();
    workerServiceMock.groupUsers.mockClear();

    component.nextPage();

    expect(workerServiceMock.groupUsers).toHaveBeenCalled();
  });

  it('should clear groups when no users are loaded', () => {
    userServiceMock.getUsers.mockReturnValueOnce(of([]));

    component.ngOnInit();
    workerServiceMock.groupUsersSubject.next([
      { title: 'A', count: 1, userIndexes: [0] }
    ]);

    component.previousPage();

    expect(component.groups()).toEqual([]);
    expect(workerServiceMock.groupUsers).not.toHaveBeenCalledWith(
      [],
      expect.anything(),
      expect.anything()
    );
  });
});
