import { Injectable } from '@angular/core';

/**
 * Structured log payload containing contextual metadata for monitoring tools.
 */
export interface LogPayload {
  timestamp: string;
  message: string;
  error?: unknown;
  context?: Record<string, unknown>;
}

/**
 * Service for central application logging and error reporting.
 */
@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  /**
   * Logs an error level message with error details and contextual metadata.
   * @param message Descriptive error title or message.
   * @param error Optional error object or exception.
   * @param context Optional key-value metadata payload.
   */
  error(message: string, error?: unknown, context?: Record<string, unknown>): LogPayload {
    return this.log('error', message, error, context);
  }

  /**
   * Logs a warning level message with optional error and context.
   * @param message Warning message.
   * @param error Optional error object or exception.
   * @param context Optional key-value metadata payload.
   */
  warn(message: string, error?: unknown, context?: Record<string, unknown>): LogPayload {
    return this.log('warn', message, error, context);
  }

  /**
   * Logs an informational message with optional context.
   * @param message Informational message.
   * @param context Optional key-value metadata payload.
   */
  info(message: string, context?: Record<string, unknown>): LogPayload {
    return this.log('info', message, undefined, context);
  }

  /**
   * Formats and outputs structured log entries to console and monitoring targets.
   */
  private log(
    level: 'error' | 'warn' | 'info',
    message: string,
    error?: unknown,
    context?: Record<string, unknown>
  ): LogPayload {
    const payload: LogPayload = {
      timestamp: new Date().toISOString(),
      message,
      ...(error !== undefined && { error }),
      ...(context !== undefined && { context })
    };

    const prefix = level === 'error' ? '[App Error]' : level === 'warn' ? '[App Warning]' : '[App Info]';
    console[level](`${prefix} ${message}`, payload);
    return payload;
  }
}
