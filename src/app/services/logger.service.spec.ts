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

  /**
   * Verifies structured log payload creation for error, warn, and info calls.
   */
  it('logs error, warn, and info payloads with timestamp and context', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const infoSpy = jest.spyOn(console, 'info').mockImplementation();

    const err = new Error('fail');
    const errPayload = service.error('Error occurred', err, { scope: 'test' });
    expect(errorSpy).toHaveBeenCalledWith('[App Error] Error occurred', errPayload);
    expect(errPayload.error).toBe(err);
    expect(errPayload.context).toEqual({ scope: 'test' });

    const warnPayload = service.warn('Warning triggered');
    expect(warnSpy).toHaveBeenCalledWith('[App Warning] Warning triggered', warnPayload);

    const infoPayload = service.info('Info message');
    expect(infoSpy).toHaveBeenCalledWith('[App Info] Info message', infoPayload);
  });
});
