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

  it('should render the avatar image with correct src and alt (if present)', () => {
    const element = fixture.nativeElement as HTMLElement;
    const img = element.querySelector('img') as HTMLImageElement | null;
    if (!img) {
      fail('Expected avatar <img> to be present');
    } else {
      expect(img.src).toContain('avatar.png');
      // Alt text may vary; verify it contains the user's full name when provided
      const alt = img.getAttribute('alt') || '';
      expect(alt).toContain('Jordan');
      expect(alt).toContain('Smith');
    }
  });

  it('should toggle expanded state when clicked and reveal additional details', () => {
    const element = fixture.nativeElement as HTMLElement;
    const card = element.querySelector('.user-item') as HTMLElement;
    expect(component.expanded()).toBeFalsy();

    card.click();
    fixture.detectChanges();
    expect(component.expanded()).toBeTruthy();
    expect(card.classList).toContain('user-item--expanded');

    // When expanded, the DOM should expose additional user details
    const text = element.textContent || '';
    expect(text).toContain('Austin'); // city
    expect(text).toContain('United States'); // country
    expect(text).toContain('555-1234'); // phone
    expect(text).toContain('30'); // age

    // Collapse again
    card.click();
    fixture.detectChanges();
    expect(component.expanded()).toBeFalsy();
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
