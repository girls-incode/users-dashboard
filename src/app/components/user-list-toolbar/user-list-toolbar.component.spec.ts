import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { GroupBy } from '../../models/grouping.model';
import { GroupOption, UserListToolbarComponent } from './user-list-toolbar.component';

describe('UserListToolbarComponent', () => {
  let component: UserListToolbarComponent;
  let fixture: ComponentFixture<UserListToolbarComponent>;
  const groupOptions: readonly GroupOption[] = [
    { value: 'name', label: 'Name' },
    { value: 'age', label: 'Age' }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserListToolbarComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(UserListToolbarComponent);
    fixture.componentRef.setInput('searchControl', new FormControl('', { nonNullable: true }));
    fixture.componentRef.setInput('groupOptions', groupOptions);
    fixture.componentRef.setInput('selectedGroup', 'name');
    fixture.componentRef.setInput('currentPage', 1);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the search, grouping, and pagination controls', () => {
    const element = fixture.nativeElement as HTMLElement;

    const search = element.querySelector('#search') as HTMLInputElement;
    expect(search).not.toBeNull();
    expect(search.minLength).toBe(3);
    expect(search.placeholder).toBe('Search by name (min 3 characters)');
    expect(element.querySelectorAll('.group-button')).toHaveLength(2);
    expect(element.textContent).toContain('Page 1');
    expect((element.querySelector('.group-button') as HTMLButtonElement).getAttribute('aria-pressed')).toBe('true');
    expect((element.querySelector('.page-controls button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('emits user interactions to its parent', () => {
    const selectedGroups: GroupBy[] = [];
    let previousPageCalls = 0;
    let nextPageCalls = 0;
    component.groupChange.subscribe(group => selectedGroups.push(group));
    component.previousPage.subscribe(() => previousPageCalls += 1);
    component.nextPage.subscribe(() => nextPageCalls += 1);
    fixture.componentRef.setInput('currentPage', 2);
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    buttons[1].click();
    buttons[2].click();
    buttons[3].click();

    expect(selectedGroups).toEqual(['age']);
    expect(previousPageCalls).toBe(1);
    expect(nextPageCalls).toBe(1);
  });
});
