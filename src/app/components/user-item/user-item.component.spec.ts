import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserItemComponent } from './user-item.component';
import { createMockUser } from '../../testing.helpers';

describe('UserItemComponent', () => {
  let component: UserItemComponent;
  let fixture: ComponentFixture<UserItemComponent>;

  const mockUser = createMockUser({
    firstname: 'Jordan',
    lastname: 'Smith',
    email: 'jordan.smith@example.com',
    age: 30,
    image: 'https://example.com/avatar.png'
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserItemComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(UserItemComponent);
    fixture.componentRef.setInput('user', mockUser);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the user name and email', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.user-item__name')?.textContent).toContain('Jordan Smith');
    expect(element.querySelector('.user-item__meta')?.textContent).toContain('jordan.smith@example.com');
  });

  it('should render the avatar image with correct src and alt', () => {
    const img = (fixture.nativeElement as HTMLElement).querySelector('img');

    expect(img?.src).toContain('avatar.png');
    expect(img?.getAttribute('alt')).toContain('Jordan');
    expect(img?.getAttribute('alt')).toContain('Smith');
  });

  it('should reflect the `expanded` input as a CSS class, without owning the state itself', () => {
    const element = fixture.nativeElement as HTMLElement;
    const card = element.querySelector('.user-item') as HTMLElement;
    expect(card.classList).not.toContain('user-item--expanded');

    fixture.componentRef.setInput('expanded', true);
    fixture.detectChanges();
    expect(card.classList).toContain('user-item--expanded');
  });

  it('should emit `toggle` when clicked, and leave deciding what that means to the parent', () => {
    const element = fixture.nativeElement as HTMLElement;
    const card = element.querySelector('.user-item') as HTMLElement;
    let toggleCount = 0;
    component.toggle.subscribe(() => toggleCount++);

    card.click();
    expect(toggleCount).toBe(1);

    card.click();
    expect(toggleCount).toBe(2);
  });

  it('should handle missing optional fields gracefully', async () => {
    // Create a user without email and image
    const incompleteUser = createMockUser({
      firstname: 'NoImg',
      lastname: 'User',
      email: '',
      age: 25,
      image: ''
    });

    // Recreate component with incomplete user
    fixture = TestBed.createComponent(UserItemComponent);
    fixture.componentRef.setInput('user', incompleteUser);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    // Email/meta should not contain an email address
    const meta = element.querySelector('.user-item__meta')?.textContent || '';
    expect(meta).not.toContain('@');

    // Avatar should not be present when image is missing
    expect(element.querySelector('img')).toBeNull();
  });
});
