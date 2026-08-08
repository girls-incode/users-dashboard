import { Component, ChangeDetectionStrategy, computed, effect, ElementRef, input, signal, viewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import { injectWindowVirtualizer } from '@tanstack/angular-virtual';
import { UserGroup } from '../../models/grouping.model';
import { User } from '../../models/user.model';
import { UserItemComponent } from '../user-item/user-item.component';
import { UserDetailsCardComponent } from '../user-details-card/user-details-card.component';

/** Gap (px) after a row; 0 for an expanded user row so it sits flush against its details row. */
const ROW_GAP = 12;

// Best-effort initial row heights for first paint; ResizeObserver (measureElement) self-corrects the rest.
const HEADER_CONTENT_HEIGHT = 52;
const USER_CONTENT_HEIGHT = 96;
const DETAILS_CONTENT_HEIGHT = 138;

/**
 * One entry in the flattened list. Every visual element on screen — a group heading, a collapsed
 * user, an expanded user's details card — is a row of this union, so the virtualizer only ever
 * deals with a single flat array of known heights.
 *
 * - `key`  — stable identity across rebuilds; drives `track` in the template and the per-row
 *            measurement cache, so a row keeps its measured height when its index shifts.
 * - `size` — the row's declared height *including* its trailing `gap`, since that gap is rendered
 *            as the row's own `padding-bottom` rather than a margin between siblings.
 * - `gap`  — trailing space, bound to `padding-bottom` in the template.
 */
export type ListRow =
  | { kind: 'header'; key: string; title: string; count: number; size: number; gap: number }
  | { kind: 'user'; key: string; user: User; size: number; gap: number }
  | { kind: 'details'; key: string; user: User; size: number; gap: number };

/**
 * Renders grouped users as a single windowed list.
 *
 * ## Flattening: nested groups → one flat array
 *
 * The input is `UserGroup[]` (each with a title and its own users), but nothing renders that shape
 * directly. It's flattened into one `ListRow[]` — `[header, user, user, header, user, ...]` — so
 * the entire list is one continuous run of rows rather than a set of per-group scroll boxes. That
 * flat array is what gets virtualized, which is why grouping never introduces nested scrollbars or
 * per-group containers.
 *
 * The flattening happens in two stages, split so that expanding a row does the least work possible:
 *
 * 1. `baseRows` — headers + users. Depends only on `groups`, so it rebuilds only when the data
 *    actually changes, never on an expand/collapse.
 * 2. `rows` — `baseRows` with a `details` row spliced in right after each expanded user. When
 *    nothing is expanded (the common case) it returns `baseRows` untouched, so the steady state
 *    costs no extra work.
 *
 * ## Expansion: inserting a row, not resizing one
 *
 * Expanding a user does **not** grow that user's row. It inserts a sibling `details` row directly
 * below it, and collapsing removes that row again. Virtualizers handle a changed array length
 * cleanly; a row silently changing height behind the viewport is the case that desyncs scroll math.
 * The expanded user's own row drops its trailing gap to 0 so it reads as one attached card with the
 * details row beneath it.
 *
 * ## Virtualization: window scrollbar + measured sizes
 *
 * `injectWindowVirtualizer` virtualizes against the real page scrollbar — there's no inner scroll
 * region — so only the visible rows (plus `overscan`) are ever in the DOM, while the container is
 * given the full `getTotalSize()` height and each mounted row is absolutely positioned at
 * `item.start`.
 *
 * Sizing is estimate-then-measure:
 * - `estimateSize` returns the row's declared `size` (the constants above) so first paint lands in
 *   roughly the right place without a visible jump.
 * - `measureElement`, applied to every mounted `#virtualItem` element by the `measureRenderedRows`
 *   effect, reads each row's *real* rendered height and caches it against that row's `getItemKey`.
 *
 * Because corrections are cached per row key, a wrong estimate self-heals into one layout pass and
 * never leaks into other rows — unlike an averaging strategy (e.g. CDK's `autosize`), where one
 * tall row skews the estimate for every other row. This is what makes rows of three different
 * heights safe to mix in a single list.
 *
 * The virtualizer options factory reads `rows()` once into a local rather than calling it inside
 * `count`, `estimateSize`, and `getItemKey` separately, so all three are guaranteed to describe the
 * exact same array snapshot.
 */
@Component({
  selector: 'app-user-list',
  standalone: true,
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, UserItemComponent, UserDetailsCardComponent]
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

  /** Virtualizes `rows` against the window scrollbar; measureElement corrects estimateSize per row key. */
  protected readonly virtualizer = injectWindowVirtualizer(() => {
    const rows = this.rows();
    return {
      count: rows.length,
      estimateSize: (index: number) => rows[index]?.size ?? 0,
      getItemKey: (index: number) => rows[index]?.key ?? index,
      overscan: 5
    };
  });

  /** Currently-mounted row elements — see `#virtualItem` in the template. */
  private readonly virtualItemElements = viewChildren<ElementRef<HTMLDivElement>>('virtualItem');

  /** Measures real row sizes, self-correcting estimateSize's guesses, per stable row key. */
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
