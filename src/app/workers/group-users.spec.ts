import { filterUserIndexes, getGroupKey, groupUserIndexes, normalizeSearch } from './group-users';
import { UserPayload } from '../models/grouping.model';

const users: UserPayload[] = [
  { firstname: 'Zoe', lastname: 'Zimmer', age: 19, nat: 'DE', location: { city: 'Berlin', country: 'Germany' } },
  { firstname: 'Alice', lastname: 'Anderson', age: 20, nat: 'US', location: { city: 'Austin', country: 'United States' }, login: { uuid: '1', username: 'alice', password: '', salt: '', md5: '', sha1: '', sha256: '' } },
  { firstname: 'Bob', lastname: 'Brown', age: 50, nat: 'US', location: { city: 'Boston', country: 'United States' } },
  { lastname: 'Unknown' }
];

describe('getGroupKey', () => {
  it('returns the uppercased first letter of first or last name, or an em dash fallback', () => {
    expect(getGroupKey({ firstname: 'Zoe' }, 'name')).toBe('Z');
    expect(getGroupKey({ lastname: 'Unknown' }, 'name')).toBe('U');
    expect(getGroupKey({}, 'name')).toBe('—');
  });

  it('buckets ages into 10-year brackets with an unknown fallback', () => {
    expect(getGroupKey({ age: 19 }, 'age')).toBe('Under 20');
    expect(getGroupKey({ age: 20 }, 'age')).toBe('20-29');
    expect(getGroupKey({ age: 50 }, 'age')).toBe('50+');
    expect(getGroupKey({}, 'age')).toBe('Unknown age');
  });

  it('falls back for missing nationality and country', () => {
    expect(getGroupKey({ nat: 'US' }, 'nationality')).toBe('US');
    expect(getGroupKey({}, 'nationality')).toBe('Unknown nationality');
    expect(getGroupKey({ location: { country: 'Germany' } as any }, 'country')).toBe('Germany');
    expect(getGroupKey({}, 'country')).toBe('Unknown country');
  });
});

describe('group-users helpers', () => {
  it('normalizes whitespace and casing in search queries', () => {
    expect(normalizeSearch('  Alice ')).toBe('alice');
    expect(normalizeSearch('')).toBe('');
  });

  it('filters case-insensitively by first name, last name, or full name', () => {
    expect(filterUserIndexes(users, 'alice')).toEqual([1]);
    expect(filterUserIndexes(users, 'Anderson')).toEqual([1]);
    expect(filterUserIndexes(users, 'Alice Anderson')).toEqual([1]);
    expect(filterUserIndexes(users, 'Zoe')).toEqual([0]);
    expect(filterUserIndexes(users, 'Bob')).toEqual([2]);
    expect(filterUserIndexes(users, 'Germany')).toEqual([]);
    expect(filterUserIndexes(users, 'Austin')).toEqual([]);
    expect(filterUserIndexes(users, 'missing')).toEqual([]);
  });

  it('matches every user when the query is under 3 characters', () => {
    expect(filterUserIndexes(users, 'Al')).toEqual([0, 1, 2, 3]);
    expect(filterUserIndexes(users, '   ')).toEqual([0, 1, 2, 3]);
  });

  it('groups only the given source indexes, preserving original positions', () => {
    expect(groupUserIndexes(users, 'country', [1])).toEqual([
      { title: 'United States', userIndexes: [1], count: 1 }
    ]);
  });

  it('groups name values, including missing names, and sorts users within a group', () => {
    const groups = groupUserIndexes(users, 'name');

    expect(groups.map(group => group.title)).toEqual(['A', 'B', 'U', 'Z']);
    expect(groups.find(group => group.title === 'A')).toEqual({ title: 'A', userIndexes: [1], count: 1 });
  });

  it.each([
    ['age', ['20-29', '50+', 'Under 20', 'Unknown age']],
    ['nationality', ['DE', 'Unknown nationality', 'US']],
    ['country', ['Germany', 'United States', 'Unknown country']]
  ] as const)('groups users by %s and assigns fallback groups', (groupBy, titles) => {
    expect(groupUserIndexes(users, groupBy).map(group => group.title)).toEqual(titles);
  });
});
