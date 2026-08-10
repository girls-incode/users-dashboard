import { Component, ChangeDetectionStrategy, computed, effect, ElementRef, input, signal, viewChildren } from '@angular/core';
import { injectWindowVirtualizer } from '@tanstack/angular-virtual';
import { UserGroup } from '../../models/grouping.model';
import { User } from '../../models/user.model';
import { UserItemComponent } from '../user-item/user-item.component';
import { UserDetailsCardComponent } from '../user-details-card/user-details-card.component';

const ROW_GAP = 12;

// Best-effort initial row heights for first paint; ResizeObserver (measureElement) self-corrects the rest.
const HEADER_CONTENT_HEIGHT = 52;
const USER_CONTENT_HEIGHT = 96;
const DETAILS_CONTENT_HEIGHT = 138;

/**
 * Fields every row shares, regardless of kind.
 *
 * - `key`  — stable identity across rebuilds; drives `track` in the template and the per-row
 *            measurement cache, so a row keeps its measured height when its index shifts.
 * - `size` — the row's declared height *including* its trailing `gap`, since that gap is rendered
 *            as the row's own `padding-bottom` rather than a margin between siblings.
 * - `gap`  — trailing space, bound to `padding-bottom` in the template.
 */
interface BaseRow {
  key: string;
  size: number;
  gap: number;
}

/**
 * One entry in the flattened list. Every visual element on screen — a group heading, a collapsed
 * user, an expanded user's details card — is a row of this union, so the virtualizer only ever
 * deals with a single flat array of known heights.
 */
export type ListRow =
  | (BaseRow & { kind: 'header'; title: string; count: number })
  | (BaseRow & { kind: 'user'; user: User })
  | (BaseRow & { kind: 'details'; user: User });

/**
 * Renders grouped users as a single virtualized list, windowed against the real page scrollbar
 * (via `injectWindowVirtualizer`) rather than an inner scroll container.
 *
 * **Flattening**: `UserGroup[]` (headers + nested users) becomes one `ListRow[]` —
 * `[header, user, user, header, ...]` — so the whole list is one continuous run of rows instead of
 * per-group scroll boxes. Built in two stages so expanding a row stays cheap: `baseRows` (headers +
 * users) rebuilds only when `groups` changes; `rows` splices a `details` row in after each expanded
 * user, returning `baseRows` untouched when nothing is expanded.
 *
 * **Expansion inserts, not resizes**: expanding adds a sibling `details` row rather than growing
 * the user's own row — virtualizers handle array-length changes cleanly, but a row silently growing
 * behind the viewport desyncs scroll math. The expanded row's own gap drops to 0 so it sits flush
 * against its details card.
 *
 * **Estimate, then measure**: `estimateSize` returns each row's declared size for first paint;
 * `measureElement` (applied to every mounted `#virtualItem` by the `measureRenderedRows` effect)
 * measures the real height afterward and caches it per row key. Because corrections are per-key
 * rather than averaged (unlike CDK's `autosize`), one tall row never skews any other row's estimate.
 */
@Component({
  selector: 'app-user-list',
  standalone: true,
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UserItemComponent, UserDetailsCardComponent]
})
export class UserListComponent {
  groups = input.required<UserGroup[]>();

  /** Expanded user ids — lives here since expanding inserts a row into the flattened list. */
  private readonly expandedUserIds = signal<ReadonlySet<string>>(new Set());

  /** Header + user rows only, independent of expand state so toggling never rebuilds this. */
  private readonly baseRows = computed<ListRow[]>(() =>
    this.groups().flatMap((group): ListRow[] => [
      {
        kind: 'header',
        key: `header-${group.title}`,
        title: group.title,
        count: group.count,
        size: HEADER_CONTENT_HEIGHT + ROW_GAP,
        gap: ROW_GAP
      },
      ...group.users.map((user, index): ListRow => ({
        kind: 'user',
        key: user.id || `${group.title}-${index}`,
        user,
        size: USER_CONTENT_HEIGHT + ROW_GAP,
        gap: ROW_GAP
      }))
    ])
  );

  /** `baseRows` with a details row spliced in after each expanded user's row. */
  protected readonly rows = computed<ListRow[]>(() => {
    const expandedIds = this.expandedUserIds();
    const base = this.baseRows();
    if (expandedIds.size === 0) {
      return base;
    }

    return base.flatMap((row): ListRow[] =>
      row.kind === 'user' && expandedIds.has(row.key)
        ? [
            { ...row, size: USER_CONTENT_HEIGHT, gap: 0 },
            {
              kind: 'details',
              key: `${row.key}-details`,
              user: row.user,
              size: DETAILS_CONTENT_HEIGHT + ROW_GAP,
              gap: ROW_GAP
            }
          ]
        : [row]
    );
  });

  /* Virtualizes `rows` against the window scrollbar; measureElement corrects estimateSize per row key. */
  protected readonly virtualizer = injectWindowVirtualizer(() => {
    const rows = this.rows();
    return {
      count: rows.length,
      estimateSize: (index: number) => rows[index]?.size ?? 0,
      getItemKey: (index: number) => rows[index]?.key ?? index,
      overscan: 5
    };
  });

  // Currently-mounted row elements
  private readonly virtualItemElements = viewChildren<ElementRef<HTMLDivElement>>('virtualItem');

  private readonly measureRenderedRows = effect(() => {
    for (const element of this.virtualItemElements()) {
      this.virtualizer.measureElement(element.nativeElement);
    }
  });

  protected isExpanded(userKey: string): boolean {
    return this.expandedUserIds().has(userKey);
  }

  protected toggleExpanded(userKey: string): void {
    this.expandedUserIds.update(current => {
      const next = new Set(current);
      if (next.has(userKey)) {
        next.delete(userKey);
      } else {
        next.add(userKey);
      }
      return next;
    });
  }
}
