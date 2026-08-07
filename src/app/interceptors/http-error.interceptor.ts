import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { LoggerService } from '../services/logger.service';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const logger = inject(LoggerService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        logger.error(`HTTP request failed: ${req.method} ${req.urlWithParams}`, error, {
          status: error.status,
          statusText: error.statusText,
          url: req.urlWithParams,
          method: req.method,
          message: error.message
        });
      } else {
        logger.error(`HTTP request failed with unknown error: ${req.method} ${req.urlWithParams}`, error, {
          url: req.urlWithParams,
          method: req.method
        });
      }
      return throwError(() => error);
    })
  );
};
