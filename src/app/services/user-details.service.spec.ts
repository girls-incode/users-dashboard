import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { User } from '../models/user.model';
import { UserDetails, UserDetailsService } from './user-details.service';

const mockUser = new User({
  id: 'user-1',
  age: 30,
  gender: 'female',
  phone: '555-1234',
  login: { uuid: 'user-1', username: 'adalovelace', password: '', salt: '', md5: '', sha1: '', sha256: '' }
});

describe('UserDetailsService', () => {
  let service: UserDetailsService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [UserDetailsService] });
    service = TestBed.inject(UserDetailsService);
  });

  it('does not emit synchronously (models an async fetch)', fakeAsync(() => {
    let result: UserDetails | undefined;
    service.getDetails(mockUser).subscribe(details => (result = details));

    expect(result).toBeUndefined();

    tick(1000);
    expect(result).toEqual({
      age: 30,
      gender: 'female',
      username: 'adalovelace',
      phone: '555-1234'
    });
  }));

  it('caches by user id: a second request for the same user resolves without waiting again', fakeAsync(() => {
    service.getDetails(mockUser).subscribe();
    tick(1000);

    let secondResult: UserDetails | undefined;
    service.getDetails(mockUser).subscribe(details => (secondResult = details));

    // No further tick() needed — the cached, already-resolved value replays synchronously.
    expect(secondResult).toEqual(expect.any(Object));
  }));

  it('keeps the cache warm after all subscribers unsubscribe, so re-expanding does not re-fetch', fakeAsync(() => {
    const subscription = service.getDetails(mockUser).subscribe();
    tick(1000);
    subscription.unsubscribe();

    let laterResult: UserDetails | undefined;
    service.getDetails(mockUser).subscribe(details => (laterResult = details));

    expect(laterResult).toBeDefined();
  }));

  it('fetches independently per user id', fakeAsync(() => {
    const otherUser = new User({
      id: 'user-2',
      age: 41,
      gender: 'male',
      phone: '555-9999',
      login: { uuid: 'user-2', username: 'otheruser', password: '', salt: '', md5: '', sha1: '', sha256: '' }
    });

    let first: UserDetails | undefined;
    let second: UserDetails | undefined;
    service.getDetails(mockUser).subscribe(details => (first = details));
    service.getDetails(otherUser).subscribe(details => (second = details));
    tick(1000);

    expect(first?.username).toBe('adalovelace');
    expect(second?.username).toBe('otheruser');
  }));
});
