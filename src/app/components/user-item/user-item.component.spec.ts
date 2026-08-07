import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserItemComponent } from './user-item.component';
import { User } from '../../models/user.model';

const mockUser = new User({
  firstname: 'Jordan',
  lastname: 'Smith',
  email: 'jordan.smith@example.com',
  nat: 'US',
  gender: 'male',
  age: 30,
  phone: '555-1234',
  location: { city: 'Austin', country: 'United States' },
  login: { uuid: 'uuid-user-1', username: 'jordansmith', password: '', salt: '', md5: '', sha1: '', sha256: '' },
  image: 'https://example.com/avatar.png'
});

describe('UserItemComponent', () => {
  let component: UserItemComponent;
  let fixture: ComponentFixture<UserItemComponent>;

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
    const incompleteUser = new User({
      firstname: 'NoImg',
      lastname: 'User',
      email: '',
      nat: 'US',
      gender: 'female',
      age: 25,
      phone: '',
      location: { city: '', country: '' },
      login: { uuid: 'uuid-user-2', username: 'noimguser', password: '', salt: '', md5: '', sha1: '', sha256: '' },
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
