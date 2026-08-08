import { TestBed } from '@angular/core/testing';
import { LoggerService } from './logger.service';

/**
 * Unit tests for LoggerService log payload creation and console output.
 */
describe('LoggerService', () => {
  let service: LoggerService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [LoggerService] });
    service = TestBed.inject(LoggerService);
  });

  it('logs an error payload with timestamp, error, and context', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const err = new Error('fail');
    const payload = service.error('Error occurred', err, { scope: 'test' });

    expect(errorSpy).toHaveBeenCalledWith('[App Error] Error occurred', payload);
    expect(payload.error).toBe(err);
    expect(payload.context).toEqual({ scope: 'test' });
    expect(payload.timestamp).toEqual(expect.any(String));
  });

  it('omits error and context keys when not supplied', () => {
    jest.spyOn(console, 'error').mockImplementation();

    const payload = service.error('Bare message');

    expect(payload).not.toHaveProperty('error');
    expect(payload).not.toHaveProperty('context');
  });
});
