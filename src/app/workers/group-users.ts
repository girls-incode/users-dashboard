import type { GroupBy, IndexedGroupResult, UserPayload } from '../models/grouping.model';

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Returns the indexes of users matching `search` by first name, last name, or full name.
 * A query under 3 characters matches everything.
 */
export function filterUserIndexes(users: UserPayload[], search: string): number[] {
  const query = normalizeSearch(search);
  if (query.length < 3) {
    return users.map((_, index) => index);
  }

  return users.reduce<number[]>((indexes, user, index) => {
    const firstName = (user.firstname ?? '').toLowerCase();
    const lastName = (user.lastname ?? '').toLowerCase();
    const fullName = `${firstName} ${lastName}`.trim();

    if (
      firstName.includes(query) ||
      lastName.includes(query) ||
      fullName.includes(query)
    ) {
      indexes.push(index);
    }
    return indexes;
  }, []);
}

/**
 * Resolves the group title/key for a single user under a given grouping strategy.
 */
export function getGroupKey(user: UserPayload, groupBy: GroupBy): string {
  switch (groupBy) {
    case 'name':
      return (user.firstname || user.lastname || '').trim().charAt(0).toUpperCase() || '—';
    case 'age':
      if (typeof user.age === 'number') {
        if (user.age < 20) return 'Under 20';
        if (user.age < 30) return '20-29';
        if (user.age < 40) return '30-39';
        if (user.age < 50) return '40-49';
        return '50+';
      }
      return 'Unknown age';
    case 'nationality':
      return user.nat || 'Unknown nationality';
    case 'country':
      return user.country || 'Unknown country';
    default:
      return 'Unknown';
  }
}

/**
 * Groups users into sorted buckets, returning each user's *index* rather than the user object, so
 * the worker can post back compact arrays instead of cloning thousands of objects back across the
 * thread boundary. The caller maps indexes back to users.
 *
 * Group keys come from `getGroupKey` (first letter, age bracket, nationality, or country). Display
 * names are precomputed in the same pass that buckets the indexes, so the per-group sort compares
 * ready-made strings instead of rebuilding them on every comparison. Groups and the users inside
 * them are sorted with one shared `Intl.Collator`.
 *
 * @param sourceIndexes Restricts grouping to these users (e.g. search results). Omit to group all.
 *
 * @example
 * groupUserIndexes(users, 'age', [0, 2, 5]);
 * // → [{ title: '20-29', userIndexes: [2], count: 1 },
 * //    { title: 'Under 20', userIndexes: [0, 5], count: 2 }]
 */
export function groupUserIndexes(
  users: UserPayload[],
  groupBy: GroupBy,
  sourceIndexes?: number[]
): IndexedGroupResult[] {
  const indexesByGroup = new Map<string, number[]>();
  const displayNames = new Array<string>(users.length);

  // `users.keys()` iterates 0..n-1 without materialising an all-indexes array.
  for (const index of sourceIndexes ?? users.keys()) {
    const user = users[index];
    const key = getGroupKey(user, groupBy);

    displayNames[index] = `${user.firstname || ''} ${user.lastname || ''}`.trim();

    const groupedIndexes = indexesByGroup.get(key);
    if (groupedIndexes) {
      groupedIndexes.push(index);
    } else {
      indexesByGroup.set(key, [index]);
    }
  }

  return Array.from(indexesByGroup, ([title, groupedIndexes]) => ({
    title,
    userIndexes: groupedIndexes.sort((a, b) => collator.compare(displayNames[a], displayNames[b])),
    count: groupedIndexes.length
  })).sort((a, b) => collator.compare(a.title, b.title));
}
