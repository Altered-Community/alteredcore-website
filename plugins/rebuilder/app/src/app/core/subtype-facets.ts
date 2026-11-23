import type { HttpParams } from '@angular/common/http';
import { toSearchParams, type CardSource, type SearchFilters } from './card-filters';
import { buildUnifiedSearchParams } from './uniques-api.service';

/**
 * Query of `GET /api/v2/search/facets` for the subtypes still giving cards with the other filters of a tab: the tab's
 * own search query (the API ignores paging and sorting, and counts without `subTypes[]`). « Toutes les cartes » sends
 * the unified search's filters (including effects, support, Frontier, rarities). The account tabs (the site's
 * endpoints) have no such count: `null`, the full list.
 */
export function subtypeFacetParams(source: CardSource, filters: SearchFilters, faction: string | null): HttpParams | null {
  if (source !== 'all') return null;
  const withoutSubtypes = { ...filters, subtypes: [] };
  return buildUnifiedSearchParams(toSearchParams(withoutSubtypes, faction, 1, 1));
}
