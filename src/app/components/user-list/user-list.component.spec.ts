import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserListComponent } from './user-list.component';
import { UserGroup } from '../../models/grouping.model';
import { User } from '../../models/user.model';

const mockGroups: UserGroup[] = [
  {
    title: 'A',
    count: 1,
    users: [
      new User({
        firstname: 'Ava',
        lastname: 'Allen',
        email: 'ava.allen@example.com',
        login: { uuid: 'uuid-1', username: 'avaallen', password: '', salt: '', md5: '', sha1: '', sha256: '' }
      })
    ]
  }
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
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the group title and count in the template', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.group-title')?.textContent).toContain('A');
    expect(element.querySelector('.group-subtitle')?.textContent).toContain('1 users');
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
});
