import { Injectable } from '@angular/core';

export interface LogPayload {
  timestamp: string;
  message: string;
  error?: unknown;
  context?: Record<string, unknown>;
}

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  /**
   * Logs a structured error entry. Returns the payload so callers (and tests) can assert on or
   * forward exactly what was logged.
   * @param message Descriptive error title or message.
   * @param error Optional error object or exception.
   * @param context Optional key-value metadata payload.
   */
  error(message: string, error?: unknown, context?: Record<string, unknown>): LogPayload {
    const payload: LogPayload = {
      timestamp: new Date().toISOString(),
      message,
      ...(error !== undefined && { error }),
      ...(context !== undefined && { context })
    };

    console.error(`[App Error] ${message}`, payload);
    return payload;
  }
}
