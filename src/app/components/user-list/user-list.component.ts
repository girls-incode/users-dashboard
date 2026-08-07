import { Component, ChangeDetectionStrategy, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule, CdkVirtualScrollableWindow } from '@angular/cdk/scrolling';
import { CdkRowSizeVirtualScroll } from '../../cdk/row-size-virtual-scroll.directive';
import { UserGroup } from '../../models/grouping.model';
import { User } from '../../models/user.model';
import { UserItemComponent } from '../user-item/user-item.component';
import { UserDetailsCardComponent } from '../user-details-card/user-details-card.component';

/** Fixed gap (in px) baked into every row's declared height below, so rows read with breathing room. */
const ROW_GAP = 12;

/**
 * Deterministic per-row-kind heights (content height + ROW_GAP), fed straight into
 * `RowSizeVirtualScrollStrategy` (see `src/app/cdk/`). That strategy computes scroll positions
 * purely from these declared numbers — it never measures or estimates from the DOM — so each row
 * kind's actual rendered CSS height MUST match its constant here exactly (enforced in
 * `user-list.component.scss` via each row's `height: 100%` of its `.virtual-item` slot, which is
 * itself sized from `row.size` below).
 */
const HEADER_ROW_HEIGHT = 52 + ROW_GAP;
const USER_ROW_HEIGHT = 96 + ROW_GAP;
const DETAILS_ROW_HEIGHT = 176 + ROW_GAP;

export type ListRow =
  | { kind: 'header'; key: string; title: string; count: number; size: number }
  | { kind: 'user'; key: string; user: User; expanded: boolean; size: number }
  | { kind: 'details'; key: string; user: User; size: number };

@Component({
  selector: 'app-user-list',
  standalone: true,
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ScrollingModule, CdkVirtualScrollableWindow, CdkRowSizeVirtualScroll, UserItemComponent, UserDetailsCardComponent]
})
export class UserListComponent {
  groups = input.required<UserGroup[]>();

  /** How far beyond the visible window (in px) the virtual scroll strategy keeps rows rendered, in each direction. */
  protected readonly bufferPx = 300;

  /**
   * Which users currently have their details row expanded. Lives here (not in `UserItemComponent`)
   * because expanding a user means inserting a whole new `DetailsRow` item into the flattened
   * list below — a decision only the list itself can make.
   */
  private readonly expandedUserIds = signal<ReadonlySet<string>>(new Set());

  /**
   * Flattens `groups` into one ordered array of virtual rows: a header row per group, a user row
   * per user, and — only for users currently expanded — a details row immediately after their
   * user row. Every row insertion/removal (i.e. every expand/collapse) changes this array's
   * *length*, which is the case CDK virtual scrolling is built to handle well; no row ever changes
   * size in place once rendered.
   */
  protected readonly rows = computed<ListRow[]>(() => {
    const expandedIds = this.expandedUserIds();
    const rows: ListRow[] = [];

    for (const group of this.groups()) {
      rows.push({
        kind: 'header',
        key: `header-${group.title}`,
        title: group.title,
        count: group.count,
        size: HEADER_ROW_HEIGHT
      });

      group.users.forEach((user, index) => {
        const userKey = user.id || `${group.title}-${index}`;
        const expanded = expandedIds.has(userKey);

        rows.push({ kind: 'user', key: userKey, user, expanded, size: USER_ROW_HEIGHT });

        if (expanded) {
          rows.push({ kind: 'details', key: `${userKey}-details`, user, size: DETAILS_ROW_HEIGHT });
        }
      });
    }

    return rows;
  });

  /** The declared size of every row in `rows()`, in the same order — what the strategy consumes. */
  protected readonly rowSizes = computed<number[]>(() => this.rows().map(row => row.size));

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

  protected trackByRowKey(index: number, row: ListRow): string {
    return row.key;
  }
}
