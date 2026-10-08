import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { contentLocale } from './locale';

/** A multi-art family of the ownership catalog. */
export interface AltArtFamily {
  familyId: number;
  faction: string;
  rarity: string;
}

/**
 * The illustrations of a family, the plain one first (`ownedQuantity`: `null` = unlimited), and the player's default
 * alt arts: one slot a copy (1st, 2nd, 3rd), `isExplicitChoice` when the player chose it (else the plain one).
 */
export interface AltArtOptions {
  options: { reference: string; ownedQuantity: number | null }[];
  slots: { slotIndex: number; reference: string; isExplicitChoice?: boolean }[];
}

export interface AltArtChoice {
  family: AltArtFamily;
  options: AltArtOptions;
}

export function familyKey(f: AltArtFamily): string {
  return `${f.familyId}:${f.faction}:${f.rarity}`;
}

/**
 * Digital ownership (`OWNERSHIP_API_URL`, through the site's relay `AlteredCore.services.ownership`): the families of
 * illustrations, the copies the player owns and their default alt arts (`core/alt-art-defaults.ts`). Any error leaves
 * the cards as they are: the deck never fails because of this service.
 */
@Service()
export class OwnershipApiService {
  private readonly http = inject(HttpClient);
  readonly baseUrl = environment.ownershipApiUrl.replace(/\/$/, '');
  private readonly site = environment.siteUrl.replace(/\/$/, '');
  private readonly version = signal(0);
  /** Bumped by each alt-art preference saved: what was read from the service before may be stale. */
  readonly altArtVersion = this.version.asReadonly();

  /**
   * Families and illustrations of `references`, by reference (none for a card with a single illustration), from the
   * site's `deck-alt-arts` (plugin core-altered-cards), which also finds the family of a reprint.
   */
  altArtChoices(references: string[]): Observable<Record<string, AltArtChoice>> {
    if (!this.baseUrl || !references.length) return of({});
    const params = references.reduce((p, r) => p.append('ref[]', r), new HttpParams());
    const url = `${this.site}/papi/core-altered-cards/deck-alt-arts`;
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
   * The token families with several illustrations (tokens are not deck cards: their prints are a preference shared by
   * every deck), from the site's `alt-art-search` (plugin ownership).
   */
  tokenAltArts(): Observable<(AltArtChoice & { name: string })[]> {
    if (!this.baseUrl) return of([]);
    const params = ['TOKEN', 'TOKEN_LANDMARK_PERMANENT', 'TOKEN_MANA']
      .reduce((p, t) => p.append('type[]', t), new HttpParams())
      .set('hideNonChoices', 'false')
      .set('locale', contentLocale());
    const url = `${this.site}/papi/ownership/alt-art-search`;
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
    return this.http
      .put<void>(`${this.baseUrl}/api/alt-arts/preferences`, { ...family, slotReferences })
      .pipe(tap({ complete: () => this.version.update((v) => v + 1) }));
  }

  /**
   * Whether the player's deck `deckId` waits for their default alt arts (decks of a player switched from the « Global »
   * mode, site's `alt-art-pending`, plugin ownership); `false` on an error.
   */
  pendingDefaults(deckId: string): Observable<boolean> {
    if (!this.baseUrl) return of(false);
    return this.http.get<{ pending?: boolean }>(`${this.site}/papi/ownership/alt-art-pending`, { params: { deck: deckId } }).pipe(
      map((res) => res?.pending === true),
      catchError(() => of(false)),
    );
  }

  /** The deck took its default alt arts: it no longer waits for them. */
  clearPendingDefaults(deckId: string): Observable<void> {
    // The site's CSRF token travels in the body, as for its other endpoints (`FavoritesService`).
    return this.http
      .post<void>(`${this.site}/papi/ownership/alt-art-pending`, { deck: deckId, csrf_token: environment.siteCsrf })
      .pipe(catchError(() => of(undefined)));
  }
}
