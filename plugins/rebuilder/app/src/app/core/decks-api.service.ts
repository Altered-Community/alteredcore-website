import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthSession } from './auth-session';
import type { Deck, DeckWrite } from './models';

export interface PublicDeckQuery {
  page?: number;
  itemsPerPage?: number;
  name?: string;
  faction?: string;
  format?: string;
  order?: 'updatedAt' | 'createdAt' | 'name' | 'upvoteCount' | 'viewCount';
}

export interface PublicDeckPage {
  member: Deck[];
  totalItems: number;
  currentPage: number;
  lastPage: number;
}

export interface DeckUpvote {
  upvoteCount: number;
  hasUpvoted: boolean;
}

@Service()
export class DecksApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthSession);
  readonly baseUrl = environment.decksApiUrl.replace(/\/$/, '');

  listMine(page = 1, itemsPerPage = 30): Observable<Deck[] | { member: Deck[] }> {
    return this.send(() =>
      this.http.get<Deck[] | { member: Deck[] }>(`${this.baseUrl}/api/decks`, {
        headers: this.headers(),
        params: {
          page,
          itemsPerPage,
          'order[updatedAt]': 'desc',
        },
      }),
    );
  }

  /**
   * `GET /api/decks/public` is anonymous; with a token, each deck's `hasUpvoted` is the caller's.
   * An expired token gets a 401 there, so the list is then fetched again without it.
   */
  listPublic(query: PublicDeckQuery = {}): Observable<PublicDeckPage> {
    const params: Record<string, string | number> = {
      page: query.page ?? 1,
      itemsPerPage: query.itemsPerPage ?? 30,
    };
    if (query.name) params['name'] = query.name;
    if (query.faction) params['faction'] = query.faction;
    if (query.format) params['format'] = query.format;
    if (query.order) params[`order[${query.order}]`] = query.order === 'name' ? 'asc' : 'desc';
    const url = `${this.baseUrl}/api/decks/public`;
    const startedWithToken = !!this.auth.token();
    const anonymous = () =>
      this.http.get<PublicDeckPage>(url, { headers: new HttpHeaders({ Accept: 'application/json' }), params });
    return this.send(() => this.http.get<PublicDeckPage>(url, { headers: this.headers(), params })).pipe(
      catchError((err: unknown) =>
        err instanceof HttpErrorResponse && err.status === 401 && startedWithToken ? anonymous() : throwError(() => err),
      ),
    );
  }

  /** Public decks are readable anonymously by UUID; private ones need the owner's token. */
  get(id: string, locale = 'en'): Observable<Deck> {
    return this.send(() =>
      this.http.get<Deck>(`${this.baseUrl}/api/decks/${encodeURIComponent(id)}`, {
        headers: this.headers(),
        params: { locale },
      }),
    );
  }

  /** Toggles the caller's like on a public deck (401 without a token). */
  upvote(id: string): Observable<DeckUpvote> {
    return this.send(() =>
      this.http.post<DeckUpvote>(`${this.baseUrl}/api/decks/${encodeURIComponent(id)}/upvote`, {}, {
        headers: this.headers(),
      }),
    );
  }

  create(body: DeckWrite): Observable<Deck> {
    return this.send(() =>
      this.http.post<Deck>(`${this.baseUrl}/api/decks`, body, {
        headers: this.headers(false),
      }),
    );
  }

  patch(id: string, body: Partial<DeckWrite>): Observable<Deck> {
    return this.send(() =>
      this.http.patch<Deck>(`${this.baseUrl}/api/decks/${encodeURIComponent(id)}`, body, {
        headers: this.headers(true),
      }),
    );
  }

  delete(id: string): Observable<void> {
    return this.send(() =>
      this.http.delete<void>(`${this.baseUrl}/api/decks/${encodeURIComponent(id)}`, {
        headers: this.headers(),
      }),
    );
  }

  /** Refreshes a near-expired access token, then retries once after a 401. */
  private send<T>(make: () => Observable<T>): Observable<T> {
    return this.auth.ensureFresh().pipe(
      switchMap(() => make()),
      catchError((err: unknown) => {
        if (!(err instanceof HttpErrorResponse) || err.status !== 401 || !this.auth.token()) return throwError(() => err);
        return this.auth.refresh().pipe(switchMap((ok) => (ok ? make() : throwError(() => err))));
      }),
    );
  }

  private headers(mergePatch = false): HttpHeaders {
    const token = this.auth.token();
    let h = new HttpHeaders({ Accept: 'application/json' });
    if (token) h = h.set('Authorization', `Bearer ${token}`);
    if (mergePatch) h = h.set('Content-Type', 'application/merge-patch+json');
    return h;
  }
}
