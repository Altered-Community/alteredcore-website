import type { HttpParams } from '@angular/common/http';
import { toSearchParams, toUniquesQuery, type CardSource, type SearchFilters } from './card-filters';
import { buildUniquesParams, buildUnifiedSearchParams } from './uniques-api.service';

/**
 * Query of `GET /api/v2/search/facets` for the subtypes still giving cards with the other filters of a tab: the tab's
 * own search query (the API ignores paging and sorting, and counts without `subTypes[]`). « Toutes les cartes » sends
 * the unified search's filters, « Uniques » the Uniques search's (effects, Frontier) restricted to the Uniques. The
 * account tabs (the site's endpoints) have no such count: `null`, the full list.
 */
export function subtypeFacetParams(source: CardSource, filters: SearchFilters, faction: string | null): HttpParams | null {
  const withoutSubtypes = { ...filters, subtypes: [] };
  switch (source) {
    case 'all':
      return buildUnifiedSearchParams(toSearchParams(withoutSubtypes, faction, 1, 1));
    case 'uniques':
      return buildUniquesParams(toUniquesQuery(withoutSubtypes, faction), null, 1).set('kind', 'unique');
    default:
      return null;
  }
}
