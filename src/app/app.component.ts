import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { UsersService } from './services/users.service';
import { GroupUsersWorkerService } from './services/group-users-worker.service';
import { User } from './models/user.model';
import { LoggerService } from './services/logger.service';
import { GroupBy, UserGroup } from './models/grouping.model';
import { UserListComponent } from './components/user-list/user-list.component';
import { GroupOption, UserListToolbarComponent } from './components/user-list-toolbar/user-list-toolbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, UserListComponent, UserListToolbarComponent]
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly usersService = inject(UsersService);
  private readonly groupUsersWorker = inject(GroupUsersWorkerService);
  private readonly logger = inject(LoggerService);
  private usersRequest?: Subscription;
  private groupingRequest?: Subscription;
  private activeSearch = '';

  users = signal<User[]>([]);
  groups = signal<UserGroup[]>([]);
  displayedUserCount = computed(() => this.groups().reduce((count, group) => count + group.count, 0));
  isLoading = signal(true);
  isGrouping = signal(false);
  errorMessage = signal<string | null>(null);
  selectedGroup = signal<GroupBy>('name');
  search = signal('');
  currentPage = signal(1);

  readonly groupOptions: readonly GroupOption[] = [
    { value: 'name', label: 'Name' },
    { value: 'age', label: 'Age' },
    { value: 'nationality', label: 'Nationality' },
    { value: 'country', label: 'Country' }
  ];

  constructor() {
    toObservable(this.search).pipe(
      debounceTime(220),
      takeUntilDestroyed()
    ).subscribe(value => {
      const normalizedSearch = value.trim();
      const nextSearch = normalizedSearch.length >= 3 ? normalizedSearch : '';

      // Unlike `valueChanges`, `toObservable` replays the signal's current value, so the initial
      // '' reaches this callback. The guard absorbs it — don't remove it.
      if (nextSearch !== this.activeSearch) {
        this.activeSearch = nextSearch;
        this.updateGroups();
      }
    });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.usersRequest?.unsubscribe();
    this.groupingRequest?.unsubscribe();
  }

  selectGroup(group: GroupBy): void {
    this.selectedGroup.set(group);
    this.updateGroups();
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
      this.loadUsers();
    }
  }

  nextPage(): void {
    this.currentPage.update(page => page + 1);
    this.loadUsers();
  }


  private loadUsers(): void {
    this.usersRequest?.unsubscribe();
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.usersRequest = this.usersService.getUsers(this.currentPage()).subscribe({
      next: users => {
        this.users.set(users);
        this.isLoading.set(false);
        this.updateGroups();
      },
      error: (error: unknown) => {
        this.logger.error('Users could not be loaded from API', error, {
          currentPage: this.currentPage(),
          selectedGroup: this.selectedGroup(),
          activeSearch: this.activeSearch
        });
        this.users.set([]);
        this.groups.set([]);
        this.isLoading.set(false);
        this.isGrouping.set(false);
        this.errorMessage.set('Users could not be loaded. Please try again.');
      }
    });
  }

  private updateGroups(): void {
    const users = this.users();
    if (!users.length) {
      this.groups.set([]);
      return;
    }

    // A superseded request would never emit (the service drops stale responses), so drop its
    // subscription rather than leaving one behind per keystroke.
    this.groupingRequest?.unsubscribe();
    this.isGrouping.set(true);
    this.groupingRequest = this.groupUsersWorker
      .groupUsers(users, this.selectedGroup(), this.activeSearch)
      .subscribe({
        next: (groupedIndices) => {
          const groups = groupedIndices.map(group => ({
            title: group.title,
            count: group.count,
            users: group.userIndexes.map(index => users[index]).filter((user): user is User => !!user)
          }));
          this.groups.set(groups);
          this.isGrouping.set(false);
        },
        error: (error: unknown) => {
          this.logger.error('Worker grouping failed', error, {
            selectedGroup: this.selectedGroup(),
            activeSearch: this.activeSearch,
            currentPage: this.currentPage()
          });
          this.groups.set([]);
          this.isGrouping.set(false);
          this.errorMessage.set('Users could not be grouped. Please try again.');
        }
      });
  }
}
