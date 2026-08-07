import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, NgZone, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { UsersService } from './services/users.service';
import { User } from './models/user.model';
import { LoggerService } from './services/logger.service';
import { GroupBy, UserGroup, WorkerResponseData } from './models/grouping.model';
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
  private readonly logger = inject(LoggerService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);
  private worker?: Worker;
  private usersRequest?: Subscription;
  private activeSearch = '';
  private groupRequestId = 0;

  users = signal<User[]>([]);
  groups = signal<UserGroup[]>([]);
  displayedUserCount = computed(() => this.groups().reduce((count, group) => count + group.count, 0));
  isLoading = signal(true);
  isGrouping = signal(false);
  errorMessage = signal<string | null>(null);
  selectedGroup = signal<GroupBy>('name');
  searchControl = new FormControl('', { nonNullable: true });
  currentPage = signal(1);

  readonly groupOptions: readonly GroupOption[] = [
    { value: 'name', label: 'Name' },
    { value: 'age', label: 'Age' },
    { value: 'nationality', label: 'Nationality' },
    { value: 'country', label: 'Country' }
  ];

  ngOnInit(): void {
    this.initializeWorker();
    this.loadUsers();

    this.searchControl.valueChanges.pipe(
      debounceTime(220),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(value => {
      const normalizedSearch = value.trim();
      const nextSearch = normalizedSearch.length >= 3 ? normalizedSearch : '';

      if (nextSearch !== this.activeSearch) {
        this.activeSearch = nextSearch;
        this.updateGroups();
      }
    });
  }

  ngOnDestroy(): void {
    this.usersRequest?.unsubscribe();
    this.worker?.terminate();
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

  /* Creates a new Web Worker and sets up the message handler to receive grouped user data. */
  private initializeWorker(): void {
    this.worker = new Worker(new URL('./workers/group-users.worker', import.meta.url), { type: 'module' });
    this.worker.onmessage = ({ data }: MessageEvent<WorkerResponseData>) => {
      if (data.requestId !== this.groupRequestId) {
        return;
      }

      this.ngZone.run(() => {
        if (data.error) {
          this.logger.error('Web worker failed processing grouping task', data.error, {
            requestId: data.requestId,
            selectedGroup: this.selectedGroup(),
            activeSearch: this.activeSearch,
            currentPage: this.currentPage()
          });
          this.groups.set([]);
          this.isGrouping.set(false);
          this.errorMessage.set('Users could not be grouped. Please try again.');
          return;
        }

        const groups = (data.groups ?? []).map(group => ({
          title: group.title,
          count: group.count,
          users: group.userIndexes.map(index => this.users()[index]).filter((user): user is User => !!user)
        }));
        this.groups.set(groups);
        this.isGrouping.set(false);
      });
    };

    this.worker.onerror = (event: ErrorEvent) => {
      this.ngZone.run(() => {
        this.logger.error('Web worker unhandled runtime error', event.error || event.message, {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          selectedGroup: this.selectedGroup(),
          currentPage: this.currentPage()
        });
        this.isGrouping.set(false);
        this.errorMessage.set('Users could not be grouped. Please try again.');
      });
    };
  }

  private loadUsers(): void {
    this.usersRequest?.unsubscribe();
    if (this.users().length > 0) {
      this.groupRequestId++;
    }
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
    if (!this.worker) {
      this.groups.set([]);
      return;
    }

    this.isGrouping.set(true);
    const requestId = ++this.groupRequestId;
    this.worker.postMessage({
      type: 'group',
      requestId,
      users: this.users(),
      groupBy: this.selectedGroup(),
      search: this.activeSearch
    });
  }
}
