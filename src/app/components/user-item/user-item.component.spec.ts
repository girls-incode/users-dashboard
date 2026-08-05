import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserItemComponent } from './user-item.component';
import { UsersService } from '../../services/users.service';
import { UsersServiceStub } from '../../services/users.service.stub';
import { MockResult } from '../../mock-data'
import { User } from '../../models/user.model'
import { UserResult } from '../../models/api-result.model'

describe('UserItemComponent', () => {
  let component: UserItemComponent;
  let fixture: ComponentFixture<UserItemComponent>;

  const mockedUsers = User.mapFromUserResult(MockResult.results as UserResult[])

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserItemComponent],
      providers: [
        {
          provide: UsersService,
          useClass: UsersServiceStub
        }
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(UserItemComponent);
    fixture.componentRef.setInput('user', mockedUsers[0]);
    fixture.componentRef.setInput('allUsers', mockedUsers);

    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate the count of users with same nationality', () => {
    const expectedNationalitiesCount = 2;
    expect(component.nationalitiesCount).toEqual(expectedNationalitiesCount);
  });
});
