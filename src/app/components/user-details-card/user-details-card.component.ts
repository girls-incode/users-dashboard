import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { User } from '../../models/user.model';
import { UserDetailsService } from '../../services/user-details.service';

/**
 * Renders a user's expanded detail fields. Backed by `UserDetailsService`'s cached, on-demand
 * fetch — the whole point of this being its own component (rather than inline content inside
 * `UserItemComponent`) is that it exists in the DOM only while its row is expanded: it's mounted
 * as a brand-new `DetailsRow` virtual item (see `UserListComponent`), so its data load naturally
 * starts on expand.
 *
 * Uses `rxResource` (loading/value/error signals, auto-cancelled and cleaned up with the
 * component) instead of a hand-rolled `effect()` + manual signals + `takeUntilDestroyed`
 * subscription — `rxResource` is Angular's built-in primitive for exactly this "reactive input in,
 * async value out" shape. Worth noting: it's `@experimental` in this Angular version, same
 * category of label that ruled out `@angular/cdk-experimental`'s `autosize` strategy elsewhere in
 * this app — but that was a specific virtual-scroll strategy with a known, documented bug;
 * `rxResource` is an Angular-core-owned primitive already recommended in Angular's own docs for
 * this pattern, a different risk profile.
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
}
