import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { User } from '../models/user.model';
import { HttpClient } from '@angular/common/http';
import { ApiResult } from '../models/api-result.model';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private readonly apiUrl = 'https://randomuser.me/api';
  private readonly httpClient = inject(HttpClient);
  private readonly logger = inject(LoggerService);

  /**
   * Fetches and maps one deterministic page of users from the API.
   * @param page Page number to retrieve (defaults to 1).
   */
  getUsers(page = 1): Observable<User[]> {
    const url = `${this.apiUrl}?results=5000&seed=awork&page=${page}`;
    return this.httpClient
      .get<ApiResult>(url)
      .pipe(
        map(apiResult => User.mapFromUserResult(apiResult.results)),
        catchError((error: unknown) => {
          this.logger.error('Failed to fetch users from API', error, {
            page,
            url
          });
          return throwError(() => error);
        })
      );
  }
}
