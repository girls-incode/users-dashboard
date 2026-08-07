import { Component, ChangeDetectionStrategy, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { injectWindowVirtualizer } from '@tanstack/angular-virtual';
import { UserGroup } from '../../models/grouping.model';
import { User } from '../../models/user.model';
import { UserItemComponent } from '../user-item/user-item.component';
import { UserDetailsCardComponent } from '../user-details-card/user-details-card.component';

/**
 * Gap (in px) rendered *after* a row, folded into its own declared height + a bound
 * `padding-bottom` (see `.virtual-item` in the stylesheet) rather than a blanket CSS rule — a
 * user row that's currently expanded gets `gap: 0` instead, so it sits flush against its own
 * details row right below it, while everything else keeps the normal breathing room.
 */
const ROW_GAP = 12;

const HEADER_CONTENT_HEIGHT = 52;
const USER_CONTENT_HEIGHT = 96;
/**
 * The details card's height, computed from its actual CSS (`user-details-card.component.scss`)
 * and the global type styles, not guessed. Root font-size is 14px (`$font-size-normal`), BUT
 * `body`'s `line-height` ends up 20px (`$line-height-normal`), not the `1` that `_reset.scss` sets
 * first — `ease-styles.scss` imports `_typography.scss` after the reset and then redeclares
 * `body, html { line-height: $line-height-normal }` itself, same specificity, later in the
 * cascade, so it wins. A fixed-length line-height (20px) inherits as that literal length, not
 * rescaled per descendant font-size, so every row here is 20px tall regardless of its own
 * font-size. 12.6px top padding (0.9rem) + 4×20px rows + 3×10.5px gaps (0.75rem) + 12px bottom
 * padding + 1px bottom border ≈ 138px. Declared sizing means this number, not the DOM, drives the
 * card's slot — if the CSS above (or the global type styles) ever changes, this must be
 * recomputed to match, or the slot will clip content or leave dead space.
 */
const DETAILS_CONTENT_HEIGHT = 138;

export type ListRow =
  | { kind: 'header'; key: string; title: string; count: number; size: number; gap: number }
  | { kind: 'user'; key: string; user: User; size: number; gap: number }
  | { kind: 'details'; key: string; user: User; size: number; gap: number };

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

  /**
   * Which users currently have their details row expanded. Lives here (not in `UserItemComponent`)
   * because expanding a user means inserting a whole new `DetailsRow` item into the flattened
   * list below — a decision only the list itself can make.
   */
  private readonly expandedUserIds = signal<ReadonlySet<string>>(new Set());

  /**
   * Header + user rows only — depends solely on `groups`, not on expand state, so toggling a row
   * never rebuilds this. Splitting it out of `rows` means the (usual) "nothing expanded" steady
   * state, and collapsing back to it, costs zero rebuild work instead of re-walking the whole list
   * on every click.
   */
  private readonly baseRows = computed<ListRow[]>(() => {
    const rows: ListRow[] = [];

    for (const group of this.groups()) {
      rows.push({
        kind: 'header',
        key: `header-${group.title}`,
        title: group.title,
        count: group.count,
        size: HEADER_CONTENT_HEIGHT + ROW_GAP,
        gap: ROW_GAP
      });

      group.users.forEach((user, index) => {
        const key = user.id || `${group.title}-${index}`;
        // Default (collapsed) size/gap — a currently-expanded user row is rewritten below to sit
        // flush against its details row instead.
        rows.push({ kind: 'user', key, user, size: USER_CONTENT_HEIGHT + ROW_GAP, gap: ROW_GAP });
      });
    }

    return rows;
  });

  /**
   * `baseRows` with a details row spliced in immediately after each currently-expanded user's row.
   * No row ever changes size in place once rendered — expand/collapse always inserts/removes a
   * whole row instead, which is the case virtualization handles well.
   */
  protected readonly rows = computed<ListRow[]>(() => {
    const expandedIds = this.expandedUserIds();
    const base = this.baseRows();
    if (expandedIds.size === 0) {
      return base;
    }

    const rows: ListRow[] = [];
    for (const row of base) {
      if (row.kind === 'user' && expandedIds.has(row.key)) {
        // No gap between a user row and its own details row — they read as one attached card.
        rows.push({ ...row, size: USER_CONTENT_HEIGHT, gap: 0 });
        rows.push({
          kind: 'details',
          key: `${row.key}-details`,
          user: row.user,
          size: DETAILS_CONTENT_HEIGHT + ROW_GAP,
          gap: ROW_GAP
        });
      } else {
        rows.push(row);
      }
    }
    return rows;
  });

  /**
   * Virtualizes `rows` against the window scrollbar (no boxed inner scroll region). `estimateSize`
   * returns each row's exact declared size — see the row-size constants above — so there's no
   * measurement/averaging step for TanStack to get wrong at list boundaries.
   *
   * `rows()` is read once here into a local, rather than separately inside `count` and each
   * callback — the whole options object is one reactive unit (this factory re-runs whenever `rows`
   * changes), so `count` and what `estimateSize`/`getItemKey` see are guaranteed to agree on the
   * exact same array, not just "whatever `rows()` currently returns" read at three different
   * moments.
   */
  protected readonly virtualizer = injectWindowVirtualizer(() => {
    const rows = this.rows();
    return {
      count: rows.length,
      estimateSize: (index: number) => rows[index]?.size ?? 0,
      getItemKey: (index: number) => rows[index]?.key ?? index,
      overscan: 5
    };
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
