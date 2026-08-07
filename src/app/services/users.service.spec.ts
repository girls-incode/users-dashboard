import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiResult } from '../models/api-result.model';
import { User } from '../models/user.model';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UsersService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(UsersService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('requests the selected page and maps the API response to users', () => {
    let users: User[] = [];
    service.getUsers(3).subscribe(result => users = result);

    const request = httpTesting.expectOne('https://randomuser.me/api?results=5000&seed=awork&page=3');
    expect(request.request.method).toBe('GET');
    request.flush({
      results: [{
        gender: 'female', name: { title: 'Ms', first: 'Ada', last: 'Lovelace' },
        location: {
          street: { number: 1, name: 'Code Street' }, city: 'London', state: 'London', country: 'UK',
          postcode: 'N1', coordinates: { latitude: '0', longitude: '0' }, timezone: { offset: '+00:00', description: 'UTC' }
        },
        email: 'ada@example.com', phone: '123', dob: { date: '1815-12-10', age: 36 },
        picture: { medium: 'ada.jpg', large: 'ada-large.jpg', thumbnail: 'ada-thumb.jpg' }, nat: 'GB',
        login: { uuid: '1', username: 'ada', password: '', salt: '', md5: '', sha1: '', sha256: '' }
      }],
      info: { seed: 'awork', results: 1, page: 3 }
    } satisfies ApiResult);

    expect(users).toEqual([expect.objectContaining({ firstname: 'Ada', image: 'ada.jpg', age: 36 })]);
  });

  it('defaults to the first page', () => {
    service.getUsers().subscribe();

    const request = httpTesting.expectOne('https://randomuser.me/api?results=5000&seed=awork&page=1');
    request.flush({ results: [], info: { seed: 'awork', results: 0, page: 1 } });
  });
});
