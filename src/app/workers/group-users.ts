import type { GroupBy, IndexedGroupResult, UserPayload, GroupResult } from '../models/grouping.model';

export function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

export function filterUsers(users: UserPayload[], search: string): UserPayload[] {
  if (normalizeSearch(search).length < 3) {
    return users;
  }
  return filterUserIndexes(users, search).map(index => users[index]);
}

export function filterUserIndexes(users: UserPayload[], search: string): number[] {
  const query = normalizeSearch(search);
  if (query.length < 3) {
    return users.map((_, index) => index);
  }

  return users.reduce<number[]>((indexes, user, index) => {
    const firstName = (user.firstname ?? '').toLowerCase();
    const lastName = (user.lastname ?? '').toLowerCase();
    const fullName = `${firstName} ${lastName}`.trim();
    const country = (user.location?.country ?? '').toLowerCase();

    if (
      firstName.includes(query) ||
      lastName.includes(query) ||
      fullName.includes(query) ||
      country.includes(query)
    ) {
      indexes.push(index);
    }
    return indexes;
  }, []);
}

export function groupUsers(users: UserPayload[], groupBy: GroupBy): GroupResult[] {
  return groupUserIndexes(users, groupBy).map(group => ({
    title: group.title,
    users: group.userIndexes.map(index => users[index]),
    count: group.count
  }));
}

export function groupUserIndexes(
  users: UserPayload[],
  groupBy: GroupBy,
  sourceIndexes: number[] = users.map((_, index) => index)
): IndexedGroupResult[] {
  const indexesByGroup = new Map<string, number[]>();

  for (const index of sourceIndexes) {
    const user = users[index];
    let key = 'Unknown';

    switch (groupBy) {
      case 'name':
        key = (user.firstname || user.lastname || '').trim().charAt(0).toUpperCase() || '—';
        break;
      case 'age':
        if (typeof user.age === 'number') {
          if (user.age < 20) key = 'Under 20';
          else if (user.age < 30) key = '20-29';
          else if (user.age < 40) key = '30-39';
          else if (user.age < 50) key = '40-49';
          else key = '50+';
        } else {
          key = 'Unknown age';
        }
        break;
      case 'nationality':
        key = user.nat || 'Unknown nationality';
        break;
      case 'country':
        key = user.location?.country || 'Unknown country';
        break;
    }

    const groupedIndexes = indexesByGroup.get(key);
    if (groupedIndexes) {
      groupedIndexes.push(index);
    } else {
      indexesByGroup.set(key, [index]);
    }
  }

  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

  const result = Array.from(indexesByGroup.entries()).map(([title, groupedIndexes]) => ({
    title,
    userIndexes: groupedIndexes.sort((a, b) => {
      const nameA = `${users[a].firstname || ''} ${users[a].lastname || ''}`.trim();
      const nameB = `${users[b].firstname || ''} ${users[b].lastname || ''}`.trim();
      return collator.compare(nameA, nameB);
    }),
    count: groupedIndexes.length
  }));

  return result.sort((a, b) => collator.compare(a.title, b.title));
}
