import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { User } from '../models/user.model';
import { HttpClient } from '@angular/common/http';
import { ApiResult } from '../models/api-result.model';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private apiUrl = 'https://randomuser.me/api'

  constructor(private httpClient: HttpClient) {
  }

  /**
   * Fetches 5000 mock users from the api
   * @param {number} page
   * @returns {Observable<User[]>}
   */
  getUsers(page = 1): Observable<User[]> {
    return this.httpClient
      .get<ApiResult>(`${this.apiUrl}?results=5000&seed=awork&page=${page}`)
      .pipe(map(apiResult => User.mapFromUserResult(apiResult.results)))
  }
}
