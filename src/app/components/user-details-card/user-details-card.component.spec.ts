import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserDetailsCardComponent } from './user-details-card.component';
import { createMockUser } from '../../testing.helpers';

describe('UserDetailsCardComponent', () => {
  let component: UserDetailsCardComponent;
  let fixture: ComponentFixture<UserDetailsCardComponent>;

  const mockUser = createMockUser({
    age: 30,
    gender: 'female',
    phone: '555-1234'
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

  it('shows a loading skeleton before the details resolve', () => {
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('.user-details-card__skeleton-row').length).toBeGreaterThan(0);
    expect(element.textContent).not.toContain('555-1234');
  });
});
