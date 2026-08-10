import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserListComponent } from './user-list.component';
import { UserGroup } from '../../models/grouping.model';
import { createMockUser } from '../../testing.helpers';

const mockGroups: UserGroup[] = [
  {
    title: 'A',
    count: 1,
    users: [createMockUser({ firstname: 'Ava', lastname: 'Allen' })]
  }
];

const multiGroupMocks: UserGroup[] = [
  { title: 'A', count: 1, users: [createMockUser({ firstname: 'Ava', lastname: 'Allen' })] },
  { title: 'B', count: 1, users: [createMockUser({ firstname: 'Bob', lastname: 'Baker' })] }
];

describe('UserListComponent', () => {
  let component: UserListComponent;
  let fixture: ComponentFixture<UserListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserListComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(UserListComponent);
    fixture.componentRef.setInput('groups', mockGroups);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the group title and count in the template', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.group-header__title')?.textContent).toContain('A');
    expect(element.querySelector('.group-header__count')?.textContent).toContain('1 users');
  });

  it('should render each user in its group', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('app-user-item')).toHaveLength(1);
    expect(element.textContent).toContain('Ava Allen');
  });

  it('should render the empty state when no groups are supplied', () => {
    fixture.componentRef.setInput('groups', []);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.empty-state')?.textContent)
      .toContain('No matching users found.');
  });

  it('should virtualize rows: size the list to total content and position each row', () => {
    const element = fixture.nativeElement as HTMLElement;
    const list = element.querySelector('.user-list') as HTMLElement;
    const items = Array.from(element.querySelectorAll('.virtual-item')) as HTMLElement[];

    expect(list.style.height).toMatch(/^\d+px$/);
    expect(items.length).toBeGreaterThan(0);
    items.forEach(item => expect(item.style.top).toMatch(/^\d+px$/));
  });

  it('should flatten multiple groups in order: each group\'s header immediately followed by its own users', async () => {
    fixture.componentRef.setInput('groups', multiGroupMocks);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const rows = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.group-header__title, app-user-item')
    ).map(node => node.textContent?.trim());

    expect(rows[0]).toBe('A');
    expect(rows[1]).toContain('Ava Allen');
    expect(rows[2]).toBe('B');
    expect(rows[3]).toContain('Bob Baker');
  });
});
