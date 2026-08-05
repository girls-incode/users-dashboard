import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserListComponent } from './user-list.component';
import { UsersService } from '../../services/users.service'
import { UsersServiceStub } from '../../services/users.service.stub'
import { User } from '../../models/user.model'
import { MockResult } from '../../mock-data'
import { UserResult } from '../../models/api-result.model'

describe('UserListComponent', () => {
  let component: UserListComponent;
  let fixture: ComponentFixture<UserListComponent>;

  const mockedUsers = User.mapFromUserResult(MockResult.results as UserResult[])

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserListComponent],
      providers: [
        {
          provide: UsersService,
          useClass: UsersServiceStub
        }
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(UserListComponent);
    fixture.componentRef.setInput('users', mockedUsers);

    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
