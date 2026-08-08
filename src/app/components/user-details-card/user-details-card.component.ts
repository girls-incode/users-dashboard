import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { User } from '../../models/user.model';
import { UserDetailsService } from '../../services/user-details.service';

/**
 * The expanded detail panel for a single user: age, gender, username, phone.
 *
 * ## Why it's a separate component
 *
 * It exists in the DOM only while its row is expanded. `UserListComponent` mounts it as a brand-new
 * `details` row in the virtualized list on expand and removes that row on collapse, so this
 * component's construction *is* the trigger for loading — there's no visibility flag to watch and
 * nothing to tear down manually. Keeping it out of `UserItemComponent` is what makes that possible;
 * inline content would live in the DOM whether or not it was ever shown.
 *
 * ## Loading
 *
 * `rxResource` turns the reactive `user` input into `isLoading()` / `value()` / `error()` signals,
 * re-running the request if the input changes and cancelling in flight work when the component is
 * destroyed (i.e. when the row collapses). That replaces what would otherwise be a hand-rolled
 * `effect()` plus manual state signals plus a `takeUntilDestroyed` subscription.
 *
 * `UserDetailsService` caches per user id, so re-expanding a previously opened row resolves
 * immediately rather than replaying the simulated latency.
 *
 * Note: `rxResource` is `@experimental` in this Angular version.
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
  private readonly detailsService = inject(UserDetailsService);

  user = input.required<User>();

  protected readonly detailsResource = rxResource({
    params: () => this.user(),
    stream: ({ params }) => this.detailsService.getDetails(params)
  });

  /**
   * The rendered rows, as label/value pairs. Drives both the real rows and the loading skeleton, so
   * the skeleton always has exactly as many placeholder rows as the resolved card will have — which
   * keeps the card's height stable across the loading→loaded transition.
   */
  protected readonly fields = computed(() => {
    const details = this.detailsResource.value();
    return [
      { label: 'Age', value: details?.age },
      { label: 'Gender', value: details?.gender },
      { label: 'Username', value: details?.username },
      { label: 'Phone', value: details?.phone }
    ];
  });
}
