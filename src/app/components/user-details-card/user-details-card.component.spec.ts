import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserDetailsCardComponent } from './user-details-card.component';
import { User } from '../../models/user.model';

const mockUser = new User({
  id: 'user-1',
  age: 30,
  gender: 'female',
  phone: '555-1234',
  login: { uuid: 'user-1', username: 'adalovelace', password: '', salt: '', md5: '', sha1: '', sha256: '' }
});

describe('UserDetailsCardComponent', () => {
  let component: UserDetailsCardComponent;
  let fixture: ComponentFixture<UserDetailsCardComponent>;

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

  it('shows a loading skeleton before the details resolve', () => {
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('.user-details-card__skeleton-row').length).toBeGreaterThan(0);
    expect(element.textContent).not.toContain('555-1234');
  });
});
