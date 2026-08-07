import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, shareReplay } from 'rxjs/operators';
import { User } from '../models/user.model';

export interface UserDetails {
  age?: number;
  gender?: string;
  username?: string;
  phone?: string;
}

/** Simulated network latency (ms) for the on-demand detail "fetch" — see class doc below. */
const SIMULATED_LATENCY_MS = 350;

/**
 * Provides the extended per-user detail fields (age, gender, username, phone) as an on-demand,
 * cached Observable, for use behind an expand/collapse interaction.
 *
 * `randomuser.me` (this app's data source, see `UsersService`) has no per-user detail endpoint —
 * it's list-only, and every field returned here already arrives on the `User` object from the
 * initial list fetch (`UsersService.getUsers`). There is therefore no real network round-trip to
 * make. This service still models a genuine lazy load: it defers building the detail view-model
 * until a caller actually asks for it (i.e. until a row is expanded), and simulates realistic
 * latency so the loading-state/caching/subscription-lifecycle plumbing around it behaves exactly
 * as it would against a real detail endpoint.
 */
@Injectable({
  providedIn: 'root'
})
export class UserDetailsService {
  private readonly cache = new Map<string, Observable<UserDetails>>();

  /**
   * Returns `user`'s detail fields. The first call for a given `user.id` "fetches" (after a
   * simulated delay); every subsequent call for the same id replays the cached result instantly
   * and does not re-fetch, even after prior subscribers have unsubscribed (`refCount: false`).
   */
  getDetails(user: User): Observable<UserDetails> {
    const cacheKey = user.id || '';
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const request$ = of({
      age: user.age,
      gender: user.gender,
      username: user.login?.username,
      phone: user.phone
    }).pipe(
      delay(SIMULATED_LATENCY_MS),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    this.cache.set(cacheKey, request$);
    return request$;
  }
}
