import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { contentLocale } from './locale';

export interface CardQuantity {
  cardReference: string;
  quantity: number;
}

/** A multi-art family of the ownership catalog. */
export interface AltArtFamily {
  familyId: number;
  faction: string;
  rarity: string;
}

/** The illustrations of a family (`ownedQuantity`: `null` = unlimited) and the player's copy slots (one per copy). */
export interface AltArtOptions {
  options: { reference: string; ownedQuantity: number | null }[];
  slots: { slotIndex: number; reference: string }[];
}

export interface AltArtChoice {
  family: AltArtFamily;
  options: AltArtOptions;
}

export function familyKey(f: AltArtFamily): string {
  return `${f.familyId}:${f.faction}:${f.rarity}`;
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

  /**
   * Families and illustrations of `references`, by reference (none for a card with a single illustration), from the
   * site's `deck-alt-arts` (plugin core-altered-cards), which also finds the family of a reprint.
   */
  altArtChoices(references: string[]): Observable<Record<string, AltArtChoice>> {
    if (!this.baseUrl || !references.length) return of({});
    const params = references.reduce((p, r) => p.append('ref[]', r), new HttpParams());
    const url = `${environment.siteUrl.replace(/\/$/, '')}/papi/core-altered-cards/deck-alt-arts`;
    return this.http.get<{ groups?: Record<string, AltArtFamily>; options?: Record<string, AltArtOptions> }>(url, { params }).pipe(
      map((res) => {
        const out: Record<string, AltArtChoice> = {};
        for (const [ref, family] of Object.entries(res?.groups ?? {})) {
          const options = res.options?.[familyKey(family)];
          if (options?.options?.length) out[ref] = { family, options };
        }
        return out;
      }),
      catchError(() => of({})),
    );
  }

  /**
   * The token families with several illustrations (per-deck alt-art mode: tokens are not deck cards, their prints are a
   * preference shared by every deck), from the site's `alt-art-search` (plugin ownership).
   */
  tokenAltArts(): Observable<(AltArtChoice & { name: string })[]> {
    if (!this.baseUrl) return of([]);
    const params = ['TOKEN', 'TOKEN_LANDMARK_PERMANENT', 'TOKEN_MANA']
      .reduce((p, t) => p.append('type[]', t), new HttpParams())
      .set('hideNonChoices', 'false')
      .set('locale', contentLocale());
    const url = `${environment.siteUrl.replace(/\/$/, '')}/papi/ownership/alt-art-search`;
    return this.http
      .get<{ families?: (AltArtFamily & { name?: string | Record<string, string> })[]; options?: Record<string, AltArtOptions> }>(url, { params })
      .pipe(
        map((res) =>
          (res?.families ?? []).flatMap((f) => {
            const options = res.options?.[familyKey(f)];
            const name = typeof f.name === 'string' ? f.name : f.name?.[contentLocale()] ?? '';
            return options?.options?.length ? [{ family: { familyId: f.familyId, faction: f.faction, rarity: f.rarity }, options, name }] : [];
          }),
        ),
      );
  }

  /** Which illustration each copy slot of a family shows (`PUT /api/alt-arts/preferences`); errors reach the caller. */
  setAltArtPreference(family: AltArtFamily, slotReferences: string[]): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/api/alt-arts/preferences`, { ...family, slotReferences });
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
