import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../models/user.model';

/**
 * The expanded detail panel for a single user: age, gender, username, phone.
 *
 * It exists in the DOM only while its row is expanded. `UserListComponent` mounts it as a brand-new
 * `details` row in the virtualized list on expand and removes that row on collapse. Keeping it out
 * of `UserItemComponent` means the inline content doesn't live in the DOM unless shown.
 *
 * All user fields are already loaded from the initial `randomuser.me` API fetch, so this component
 * renders immediately without any async operation or service call.
 */
@Component({
  selector: 'app-user-details-card',
  standalone: true,
  templateUrl: './user-details-card.component.html',
  styleUrls: ['./user-details-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule]
})
export class UserDetailsCardComponent {
  user = input.required<User>();

  /**
   * The rendered rows, as label/value pairs: age, gender, username, phone.
   */
  protected readonly fields = computed(() => {
    const user = this.user();
    return [
      { label: 'Age', value: user.age },
      { label: 'Gender', value: user.gender },
      { label: 'Username', value: user.login?.username },
      { label: 'Phone', value: user.phone }
    ];
  });
}
