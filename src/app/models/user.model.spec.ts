import { User } from './user.model';
import { UserResult } from './api-result.model';

describe('User', () => {
  it.each([
    [{ city: 'Madrid', country: 'Spain' }, 'Madrid, Spain'],
    [{ city: 'Madrid' }, 'Madrid'],
    [{ country: 'Spain' }, 'Spain'],
    [{ city: '  ', country: ' Spain ' }, 'Spain'],
    [undefined, '']
  ])('formats a location label for %o', (location, expected) => {
    expect(new User({ location }).locationLabel).toBe(expected);
  });

  it('maps API users to the view model fields', () => {
    const apiUser: UserResult = {
      gender: 'female',
      name: { title: 'Ms', first: 'Ada', last: 'Lovelace' },
      location: {
        street: { number: 12, name: 'Code Street' }, city: 'London', state: 'London',
        country: 'United Kingdom', postcode: 'N1', coordinates: { latitude: '0', longitude: '0' },
        timezone: { offset: '+00:00', description: 'UTC' }
      },
      email: 'ada@example.com', phone: '123', dob: { date: '1815-12-10', age: 36 },
      picture: { medium: 'medium.jpg', large: 'large.jpg', thumbnail: 'thumb.jpg' }, nat: 'GB',
      login: { uuid: 'id-1', username: 'ada', password: '', salt: '', md5: '', sha1: '', sha256: '' }
    };

    expect(User.mapFromUserResult([apiUser])).toEqual([
      expect.objectContaining({
        firstname: 'Ada', lastname: 'Lovelace', email: 'ada@example.com', phone: '123',
        image: 'medium.jpg', nat: 'GB', gender: 'female', age: 36, login: apiUser.login,
        location: { street: '12 Code Street', city: 'London', state: 'London', country: 'United Kingdom', postcode: 'N1' }
      })
    ]);
  });
});
