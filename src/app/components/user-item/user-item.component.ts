import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../models/user.model';

/**
 * The collapsed row for a single user: avatar, name, email, nationality and location.
 *
 * Fully presentational — it holds no state of its own. Clicking anywhere on the card emits
 * `toggle`, reporting intent without acting on it, and `expanded` comes back down as an input that
 * only drives styling (`.user-item--expanded`).
 *
 * That split is deliberate rather than incidental: expanding a user isn't a local visual change,
 * it inserts a whole new `details` row into `UserListComponent`'s flattened, virtualized list. Only
 * the list can do that, so the list owns the set of expanded ids and this component stays a pure
 * function of its inputs. The detail panel itself is a separate sibling row — see
 * `UserDetailsCardComponent`.
 *
 * The avatar is `loading="lazy"` / `decoding="async"` so offscreen rows don't fetch or block paint,
 * and is omitted entirely when the user has no image.
 */
@Component({
  selector: 'app-user-item',
  standalone: true,
  templateUrl: './user-item.component.html',
  styleUrls: ['./user-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule]
})
export class UserItemComponent {
  user = input.required<User>();
  expanded = input(false);
  toggle = output<void>();
}
