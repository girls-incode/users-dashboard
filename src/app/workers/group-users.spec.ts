import { filterUsers, filterUserIndexes, groupUserIndexes, groupUsers, normalizeSearch } from './group-users';
import { UserPayload } from '../models/grouping.model';

const users: UserPayload[] = [
  { firstname: 'Zoe', lastname: 'Zimmer', age: 19, nat: 'DE', location: { city: 'Berlin', country: 'Germany' } },
  { firstname: 'Alice', lastname: 'Anderson', age: 20, nat: 'US', location: { city: 'Austin', country: 'United States' }, login: { uuid: '1', username: 'alice', password: '', salt: '', md5: '', sha1: '', sha256: '' } },
  { firstname: 'Bob', lastname: 'Brown', age: 50, nat: 'US', location: { city: 'Boston', country: 'United States' } },
  { lastname: 'Unknown' }
];

describe('group-users helpers', () => {
  it('normalizes whitespace and casing in search queries', () => {
    expect(normalizeSearch('  Alice ')).toBe('alice');
    expect(normalizeSearch('')).toBe('');
  });

  it('filters case-insensitively by first name, last name, full name, or country', () => {
    expect(filterUsers(users, 'alice')).toEqual([users[1]]);
    expect(filterUsers(users, 'Anderson')).toEqual([users[1]]);
    expect(filterUsers(users, 'Alice Anderson')).toEqual([users[1]]);
    expect(filterUsers(users, 'Germany')).toEqual([users[0]]);
    expect(filterUsers(users, 'United States')).toEqual([users[1], users[2]]);
    expect(filterUsers(users, 'Al')).toBe(users);
    expect(filterUsers(users, 'Austin')).toEqual([]);
    expect(filterUsers(users, 'missing')).toEqual([]);
    expect(filterUsers(users, '   ')).toBe(users);
  });

  it('preserves original indexes when filtering users', () => {
    expect(filterUserIndexes(users, 'Alice')).toEqual([1]);
    expect(groupUserIndexes(users, 'country', [1])).toEqual([
      { title: 'United States', userIndexes: [1], count: 1 }
    ]);
  });

  it('groups name values, including missing names, and sorts users within a group', () => {
    const groups = groupUsers(users, 'name');

    expect(groups.map(group => group.title)).toEqual(['A', 'B', 'U', 'Z']);
    expect(groups.find(group => group.title === 'A')).toMatchObject({ count: 1, users: [users[1]] });
  });

  it('returns sorted indexes for worker responses without cloning user objects', () => {
    const groups = groupUserIndexes(users, 'name');

    expect(groups.find(group => group.title === 'A')).toEqual({ title: 'A', userIndexes: [1], count: 1 });
  });

  it.each([
    ['age', ['20-29', '50+', 'Under 20', 'Unknown age']],
    ['nationality', ['DE', 'Unknown nationality', 'US']],
    ['country', ['Germany', 'United States', 'Unknown country']]
  ] as const)('groups users by %s and assigns fallback groups', (groupBy, titles) => {
    expect(groupUsers(users, groupBy).map(group => group.title)).toEqual(titles);
  });
});
