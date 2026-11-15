import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { map, of, switchMap, type Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CardsApiService } from './cards-api.service';
import { filterSetsWithPromos, parseCostExpression, rarityOptionsFor, variationCodes, type SearchFilters } from './card-filters';
import { formatInfo } from './formats';
import { mergeUniqueFace } from './deck-view';
import { contentLocale } from './locale';
import type { Card, DeckFormat } from './models';

/** The card lists of the site's account tabs, as the site's deck builder: favorites, physical collection, digital ownership. */
export type OwnedSource = 'favorites' | 'collection' | 'owned';

export interface OwnedPage {
  member: Card[];
  totalItems: number;
  lastPage: number;
}

/** A collection line (`cardReference`, `quantity`, `name` in one language) as a card of the grid. */
interface CollectionItem {
  cardReference?: string;
  reference?: string;
  name?: string | Record<string, string>;
  quantity?: number;
  /** Powers of the ownership API. */
  forest?: number | null;
  mountain?: number | null;
  ocean?: number | null;
}

const ENDPOINT: Record<OwnedSource, string> = {
  favorites: 'favorites-search',
  collection: 'collection-search',
  owned: 'ownership-search',
};

/**
 * Searches the user's own cards through the site's card plugin endpoints (`/papi/core-altered-cards/…`), which read
 * the favorites table, the collection API and the ownership API with the session's token.
 */
@Service()
export class OwnedCardsService {
  private readonly http = inject(HttpClient);
  private readonly cards = inject(CardsApiService);

  search(source: OwnedSource, filters: SearchFilters, factions: string[], page: number, itemsPerPage: number, format: DeckFormat | null = null): Observable<OwnedPage> {
    if (!listedRarities(source, filters, format).length) return of({ member: [], totalItems: 0, lastPage: 1 });
    const url = `${environment.siteUrl.replace(/\/$/, '')}/papi/core-altered-cards/${ENDPOINT[source]}`;
    return this.http.get<{ member?: (Card & CollectionItem)[]; totalItems?: number; lastPage?: number }>(url, { params: ownedParams(source, filters, factions, page, itemsPerPage, format) }).pipe(
      map((res) => ({
        member: (res.member ?? []).map((c) => (source === 'favorites' ? c : collectionCard(c))).filter((c) => !!c.reference),
        totalItems: res.totalItems ?? 0,
        lastPage: res.lastPage ?? 1,
      })),
      switchMap((page) =>
        this.cards.uniqueFaces(page.member).pipe(
          map((faces) => ({ ...page, member: page.member.map((c) => (faces.has(c.reference) ? mergeUniqueFace(c, faces.get(c.reference)!) : c)) })),
        ),
      ),
    );
  }
}

/** Rarities a tab lists: the chosen ones (all when none), without the Uniques when `format` (see legalFormat()) forbids them. */
export function listedRarities(source: OwnedSource, f: SearchFilters, format: DeckFormat | null): string[] {
  const picked = f.rarities.length ? f.rarities : rarityOptionsFor(source).map((r) => r.value);
  return format && formatInfo(format).uniqueMax === 0 ? picked.filter((r) => r !== 'UNIQUE') : picked;
}

/** Query of each endpoint (their names differ: `set[]` / `cardSet[]`…). Lists as `key[]`: PHP keeps the last value of a repeated `key=…`. */
export function ownedParams(source: OwnedSource, f: SearchFilters, factions: string[], page: number, itemsPerPage: number, format: DeckFormat | null = null): HttpParams {
  let p = new HttpParams().set('page', page).set('itemsPerPage', itemsPerPage).set('locale', contentLocale());
  const add = (key: string, values: readonly string[]) => values.forEach((v) => (p = p.append(key, v)));
  add('faction[]', factions);
  // Every rarity: no filter, so the cards without a rarity (favorites saved before it was) still show.
  const rarities = listedRarities(source, f, format);
  if (rarities.length < rarityOptionsFor(source).length) add('rarity[]', rarities);
  if (source === 'favorites') {
    add('set[]', f.sets);
    return p;
  }
  add('cardType[]', f.types);
  add('cardSet[]', source === 'owned' ? filterSetsWithPromos(f) : f.sets);
  add('subTypes[]', f.subtypes);
  if (source === 'owned') add('variation[]', variationCodes(f));
  if (f.q.trim()) p = p.set('name', f.q.trim());
  // Both collection-search and ownership-search accept `[gte]`/`[lte]` bounds for contiguous spans
  // and `field[]` arrays for disjoint lists (narrowed upstream + exact-filtered in PHP).
  const numericFields: readonly [string, string][] = [
    ['mainCost', f.mainCost],
    ['recallCost', f.recallCost],
    ['forestPower', f.forestPower],
    ['mountainPower', f.mountainPower],
    ['oceanPower', f.oceanPower],
  ];
  for (const [key, expr] of numericFields) {
    const vals = parseCostExpression(expr) ?? [];
    if (!vals.length) continue;
    const min = vals[0];
    const max = vals[vals.length - 1];
    if (vals.length === max - min + 1) {
      p = p.set(`${key}[gte]`, min).set(`${key}[lte]`, max);
    } else {
      for (const v of vals) p = p.append(`${key}[]`, v);
    }
  }
  return p;
}

function collectionCard(c: Card & CollectionItem): Card {
  const reference = c.cardReference || c.reference || '';
  const powers = c.forest === undefined ? {} : { forestPower: c.forest, mountainPower: c.mountain, oceanPower: c.ocean };
  return { ...c, ...powers, reference, name: c.name ?? reference } as Card;
}
