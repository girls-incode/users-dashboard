import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserListComponent } from './user-list.component';
import { UserGroup } from '../../models/grouping.model';
import { User } from '../../models/user.model';

function makeUser(id: string, firstname: string, lastname: string): User {
  return new User({
    firstname,
    lastname,
    email: `${firstname}.${lastname}@example.com`.toLowerCase(),
    login: { uuid: id, username: firstname.toLowerCase(), password: '', salt: '', md5: '', sha1: '', sha256: '' }
  });
}

const mockGroups: UserGroup[] = [
  {
    title: 'A',
    count: 1,
    users: [makeUser('uuid-1', 'Ava', 'Allen')]
  }
];

const multiGroupMocks: UserGroup[] = [
  { title: 'A', count: 1, users: [makeUser('uuid-a', 'Ava', 'Allen')] },
  { title: 'B', count: 1, users: [makeUser('uuid-b', 'Bob', 'Baker')] }
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
    // No forced/min height on the row wrapper itself — each row is sized entirely by its own
    // content (see UserItemComponent/UserDetailsCardComponent), not stretched or floored by a
    // TanStack estimate, so there's never a gap between a row's real content and its slot.
    items.forEach(item => expect(item.style.top).toMatch(/^\d+px$/));
  });

  it('should insert a details row after a user is expanded, and remove it on collapse', async () => {
    let element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-user-details-card')).toBeNull();

    (element.querySelector('.user-item') as HTMLElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-user-details-card')).not.toBeNull();

    (element.querySelector('.user-item') as HTMLElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-user-details-card')).toBeNull();
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
