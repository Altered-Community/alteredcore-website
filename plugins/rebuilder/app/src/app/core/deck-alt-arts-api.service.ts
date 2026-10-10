import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { type Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * The brush's choices for a deck (site's `deck-alt-arts`, plugin rebuilder): the illustration of the 1st, 2nd and 3rd
 * card of each multi-art card, in order, by family key (`familyKey`). The decks API keeps only the deck's references,
 * with no order and nothing past its copies; the default alt arts stay in the ownership service.
 */
@Service()
export class DeckAltArtsApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.siteUrl.replace(/\/$/, '')}/papi/rebuilder/deck-alt-arts`;

  /** The deck's choices, by family key; none on an error (the deck's references then give them). */
  load(deckId: string): Observable<Record<string, string[]>> {
    return this.http.get<{ families?: Record<string, string[]> }>(this.url, { params: { deck: deckId } }).pipe(
      map((res) => res?.families ?? {}),
      catchError(() => of({})),
    );
  }

  /** The cards of family `family` in the deck; `null`: the family follows the default alt arts again. Errors reach the caller. */
  save(deckId: string, family: string, cards: readonly string[] | null): Observable<void> {
    // The site's CSRF token travels in the body, as for its other endpoints (`FavoritesService`).
    return this.http.post<void>(this.url, { deck: deckId, family, cards, csrf_token: environment.siteCsrf });
  }

  /** Every card of the deck follows the default alt arts again (« Appliquer les arts par défaut »). */
  clear(deckId: string): Observable<void> {
    return this.http.post<void>(this.url, { deck: deckId, csrf_token: environment.siteCsrf }).pipe(catchError(() => of(undefined)));
  }
}
