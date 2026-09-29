import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CardQuantity {
  cardReference: string;
  quantity: number;
}

/**
 * Digital ownership (`OWNERSHIP_API_URL`, through the site's relay `AlteredCore.services.ownership`):
 * the user's alt-art preference. In « Global » mode, the cards of a new deck are swapped for the
 * alt arts the user prefers and owns. Any error leaves the cards as they are: an import never fails
 * because of this service.
 */
@Service()
export class OwnershipApiService {
  private readonly http = inject(HttpClient);
  readonly baseUrl = environment.ownershipApiUrl.replace(/\/$/, '');

  /** `true` when the user applies their alt-art preferences to every deck. */
  globalAltArts(): Observable<boolean> {
    if (!this.baseUrl) return of(false);
    return this.http.get<{ mode?: string }>(`${this.baseUrl}/api/alt-arts/preference-mode`).pipe(
      map((body) => body?.mode === 'Global'),
      catchError(() => of(false)),
    );
  }

  /** The cards with the preferred alt arts, as `POST /api/alt-arts/apply-to-deck` returns them. */
  applyAltArts(cards: CardQuantity[]): Observable<CardQuantity[]> {
    if (!this.baseUrl || !cards.length) return of(cards);
    const body = cards.map((c) => ({ reference: c.cardReference, quantity: c.quantity }));
    return this.http.post<{ lines?: unknown }>(`${this.baseUrl}/api/alt-arts/apply-to-deck`, body).pipe(
      map((res) => mergeAltArtLines(res?.lines) ?? cards),
      catchError(() => of(cards)),
    );
  }
}

/**
 * `lines[i]` is the list of references standing for input line `i` (an owned alt art for part of
 * the copies, the printed card for the rest): flattened, with repeated references summed. `null`
 * when the response has no usable lines.
 */
export function mergeAltArtLines(lines: unknown): CardQuantity[] | null {
  if (!Array.isArray(lines)) return null;
  const sum = new Map<string, number>();
  for (const group of lines) {
    for (const line of Array.isArray(group) ? group : [group]) {
      const { reference, quantity } = (line ?? {}) as { reference?: unknown; quantity?: unknown };
      // Quantities read like PHP's `(int)` (the site's importer): numeric strings count.
      const qty = Math.trunc(Number(quantity));
      if (typeof reference !== 'string' || !reference || !Number.isFinite(qty)) continue;
      sum.set(reference, (sum.get(reference) ?? 0) + qty);
    }
  }
  return sum.size ? [...sum].map(([cardReference, quantity]) => ({ cardReference, quantity })) : null;
}
