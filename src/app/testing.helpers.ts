import { of, Subject } from 'rxjs';
import { User } from './models/user.model';
import { IndexedGroupResult } from './models/grouping.model';
import { UserResult } from './models/api-result.model';
import { UsersService } from './services/users.service';
import { MockResult } from './mock-data';

export function createMockUser(overrides?: Partial<User>): User {
  return new User({
    id: 'user-1',
    firstname: 'John',
    lastname: 'Doe',
    age: 30,
    gender: 'male',
    phone: '555-1234',
    nat: 'US',
    location: {
      city: 'Springfield',
      state: 'IL',
      country: 'United States'
    },
    login: {
      uuid: 'test-uuid',
      username: 'johndoe',
      password: 'hashed',
      salt: 'salt',
      md5: 'md5hash',
      sha1: 'sha1hash',
      sha256: 'sha256hash'
    },
    email: 'john@example.com',
    image: '',
    ...overrides
  });
}

export class UsersServiceMock implements Partial<UsersService> {
  getUsers = jest.fn(() => of(User.mapFromUserResult(MockResult.results as UserResult[])));
}

/**
 * Mock GroupUsersWorkerService for testing components that depend on it.
 * Provides a Subject-based interface for simulating async responses.
 */
export class GroupUsersWorkerServiceMock {
  groupUsersSubject = new Subject<IndexedGroupResult[]>();
  groupUsers = jest.fn(() => this.groupUsersSubject.asObservable());
  ngOnDestroy = jest.fn();
}
