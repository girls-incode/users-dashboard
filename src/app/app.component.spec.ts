import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { UsersService } from './services/users.service'
import { UsersServiceStub } from './services/users.service.stub'

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        {
          provide: UsersService,
          useClass: UsersServiceStub
        }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
