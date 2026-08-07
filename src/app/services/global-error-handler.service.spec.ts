import { TestBed } from '@angular/core/testing';
import { GlobalErrorHandler } from './global-error-handler.service';
import { LoggerService } from './logger.service';

describe('GlobalErrorHandler', () => {
  let errorHandler: GlobalErrorHandler;
  let loggerService: LoggerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GlobalErrorHandler, LoggerService]
    });
    errorHandler = TestBed.inject(GlobalErrorHandler);
    loggerService = TestBed.inject(LoggerService);
  });

  it('delegates uncaught errors to LoggerService with GlobalErrorHandler context', () => {
    const loggerSpy = jest.spyOn(loggerService, 'error').mockImplementation();
    const error = new Error('Uncaught runtime exception');

    errorHandler.handleError(error);

    expect(loggerSpy).toHaveBeenCalledWith('Uncaught global application error', error, {
      source: 'GlobalErrorHandler'
    });
  });
});
