import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../models/user.model';

/**
 * Presentational collapsed-row card. Owns no expand state and no detail content itself — the
 * parent list decides which users are expanded (so it can insert a sibling details row into the
 * virtualized list) and passes that down via `expanded`; clicking the row just reports intent via
 * `toggle`. See `UserDetailsCardComponent` for the expanded detail panel.
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
