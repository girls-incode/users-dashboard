import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GroupOption, UserListToolbarComponent } from './user-list-toolbar.component';

describe('UserListToolbarComponent', () => {
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
    fixture.componentRef.setInput('search', '');
    fixture.componentRef.setInput('groupOptions', groupOptions);
    fixture.componentRef.setInput('selectedGroup', 'name');
    fixture.componentRef.setInput('currentPage', 1);
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
});
