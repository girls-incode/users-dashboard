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

  it('should use a single window-scrolled virtual scroll viewport, not the fixed-size or autosize strategies', () => {
    const viewports = (fixture.nativeElement as HTMLElement).querySelectorAll('cdk-virtual-scroll-viewport');

    expect(viewports).toHaveLength(1);
    expect(viewports[0].hasAttribute('scrollWindow')).toBe(true);
    expect(viewports[0].hasAttribute('itemSize')).toBe(false);
    expect(viewports[0].hasAttribute('autosize')).toBe(false);
  });

  it('should declare a fixed pixel height per row, matching the deterministic row-size strategy\'s contract', () => {
    const items = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.virtual-item')
    ) as HTMLElement[];

    expect(items.length).toBeGreaterThan(0);
    items.forEach(item => expect(item.style.height).toMatch(/^\d+px$/));
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
