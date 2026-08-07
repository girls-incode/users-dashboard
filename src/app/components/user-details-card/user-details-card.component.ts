import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { User } from '../../models/user.model';
import { UserDetails, UserDetailsService } from '../../services/user-details.service';

/**
 * Renders a user's expanded detail fields. Backed by `UserDetailsService`'s cached, on-demand
 * fetch — the whole point of this being its own component (rather than inline content inside
 * `UserItemComponent`) is that it exists in the DOM only while its row is expanded: it's mounted
 * as a brand-new `DetailsRow` virtual item (see `UserListComponent`), so its data load naturally
 * starts on expand and its subscription is torn down on collapse via `takeUntilDestroyed`.
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
  private readonly destroyRef = inject(DestroyRef);

  user = input.required<User>();

  protected readonly details = signal<UserDetails | null>(null);
  protected readonly loading = signal(true);

  constructor() {
    effect(() => {
      const user = this.user();
      this.loading.set(true);
      this.details.set(null);

      this.detailsService
        .getDetails(user)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(details => {
          this.details.set(details);
          this.loading.set(false);
        });
    });
  }
}
