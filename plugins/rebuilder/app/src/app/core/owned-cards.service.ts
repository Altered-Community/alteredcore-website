import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { map, of, type Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { RARITY_OPTIONS, parseCostExpression, rarityOptionsFor, type SearchFilters } from './card-filters';
import { formatInfo } from './formats';
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

  search(source: OwnedSource, filters: SearchFilters, factions: string[], page: number, itemsPerPage: number, format: DeckFormat | null = null): Observable<OwnedPage> {
    if (source === 'favorites' && !favoriteRarities(filters, format).length) return of({ member: [], totalItems: 0, lastPage: 1 });
    const url = `${environment.siteUrl.replace(/\/$/, '')}/papi/core-altered-cards/${ENDPOINT[source]}`;
    return this.http.get<{ member?: (Card & CollectionItem)[]; totalItems?: number; lastPage?: number }>(url, { params: ownedParams(source, filters, factions, page, itemsPerPage, format) }).pipe(
      map((res) => ({
        member: (res.member ?? []).map((c) => (source === 'favorites' ? c : collectionCard(c))).filter((c) => !!c.reference),
        totalItems: res.totalItems ?? 0,
        lastPage: res.lastPage ?? 1,
      })),
    );
  }
}

/** Rarities of the Favoris tab: the chosen ones (all when none), without the Uniques in a No Unique format (« légales »). */
export function favoriteRarities(f: SearchFilters, format: DeckFormat | null): string[] {
  const picked = f.rarities.length ? f.rarities : rarityOptionsFor('favorites').map((r) => r.value);
  return format && f.legalOnly && formatInfo(format).uniqueMax === 0 ? picked.filter((r) => r !== 'UNIQUE') : picked;
}

/** Query of each endpoint (their names differ: `faction[]` / `faction`, `set[]` / `cardSet`…). */
export function ownedParams(source: OwnedSource, f: SearchFilters, factions: string[], page: number, itemsPerPage: number, format: DeckFormat | null = null): HttpParams {
  let p = new HttpParams().set('page', page).set('itemsPerPage', itemsPerPage).set('locale', contentLocale());
  const rarities = f.rarities.length ? f.rarities : RARITY_OPTIONS.map((r) => r.value);
  const add = (key: string, values: readonly string[]) => values.forEach((v) => (p = p.append(key, v)));
  if (source === 'favorites') {
    add('faction[]', factions);
    // Every rarity: no filter, so the stars saved without their rarity (older favorites) still show.
    const picked = favoriteRarities(f, format);
    if (picked.length < rarityOptionsFor('favorites').length) add('rarity[]', picked);
    add('set[]', f.sets);
    return p;
  }
  add('faction', factions);
  add('rarity', rarities);
  add('cardType', f.types);
  add('cardSet', f.sets);
  add('subTypes', f.subtypes);
  if (f.q.trim()) p = p.set('name', f.q.trim());
  const costs = parseCostExpression(f.mainCost) ?? [];
  if (costs.length) {
    // The collection API takes a range, the ownership API one exact value.
    if (source === 'collection') p = p.set('mainCost[gte]', Math.min(...costs)).set('mainCost[lte]', Math.max(...costs));
    else if (costs.length === 1) p = p.append('mainCost[]', costs[0]);
  }
  return p;
}

function collectionCard(c: Card & CollectionItem): Card {
  const reference = c.cardReference || c.reference || '';
  return { ...c, reference, name: c.name ?? reference } as Card;
}
