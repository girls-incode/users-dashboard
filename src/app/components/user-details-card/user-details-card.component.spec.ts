import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserDetailsCardComponent } from './user-details-card.component';
import { createMockUser } from '../../testing.helpers';

describe('UserDetailsCardComponent', () => {
  let component: UserDetailsCardComponent;
  let fixture: ComponentFixture<UserDetailsCardComponent>;

  const mockUser = createMockUser({
    age: 30,
    gender: 'female',
    phone: '555-1234',
    login: { uuid: 'test-uuid', username: 'testuser', password: '', salt: '', md5: '', sha1: '', sha256: '' }
  });

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [UserDetailsCardComponent] });
    fixture = TestBed.createComponent(UserDetailsCardComponent);
    fixture.componentRef.setInput('user', mockUser);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('shows skeleton and renders user details immediately', () => {
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('.user-details-card__skeleton-row').length).toBeGreaterThan(0);

    expect(element.textContent).toContain('30');
    expect(element.textContent).toContain('female');
    expect(element.textContent).toContain('555-1234');
    expect(element.textContent).toContain('testuser');
  });

  it('shows all four detail fields: age, gender, username, phone', () => {
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('.user-details-card__row');

    expect(rows.length).toBe(4);
    expect(rows[0].textContent).toContain('Age');
    expect(rows[1].textContent).toContain('Gender');
    expect(rows[2].textContent).toContain('Username');
    expect(rows[3].textContent).toContain('Phone');
  });
});
