import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { httpErrorInterceptor } from './http-error.interceptor';
import { LoggerService } from '../services/logger.service';

describe('httpErrorInterceptor', () => {
  let httpClient: HttpClient;
  let httpTesting: HttpTestingController;
  let loggerService: LoggerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LoggerService,
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting()
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    loggerService = TestBed.inject(LoggerService);
  });

  afterEach(() => httpTesting.verify());

  it('intercepts failed HTTP requests and logs details to LoggerService', () => {
    const loggerSpy = jest.spyOn(loggerService, 'error').mockImplementation();

    httpClient.get('/api/users').subscribe({
      error: (err: HttpErrorResponse) => {
        expect(err.status).toBe(500);
      }
    });

    const req = httpTesting.expectOne('/api/users');
    req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

    expect(loggerSpy).toHaveBeenCalledWith(
      'HTTP request failed: GET /api/users',
      expect.any(HttpErrorResponse),
      expect.objectContaining({
        status: 500,
        statusText: 'Internal Server Error',
        url: '/api/users',
        method: 'GET'
      })
    );
  });
});
