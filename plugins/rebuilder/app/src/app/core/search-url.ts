import type { Params } from '@angular/router';
import { ORDER_OPTIONS, typeOptionOf, type AltArtsMode, type CardSource, type SearchFilters } from './card-filters';
import type { CardOrder } from './models';

/**
 * The card browser's filters in its URL (`/pages/cards?…`), so a reload or a shared link finds the same search. The names
 * are the site's former card search's (`faction[]`, `type[]`, `set[]`, `subtype[]`, `forest`, `hasNoEffect`…): its links
 * still open the same search. Only what differs from the tab's default filters is written. The Uniques' effect blocks
 * are not (their abilities need the effects vocabulary to be shown again).
 */

/** `?tab=` of the site's former card search → the tab of the search. */
const LEGACY_TABS: Record<string, CardSource> = { unique: 'uniques', collection: 'collection', ownership: 'owned', favoris: 'favorites' };

const SOURCES: readonly CardSource[] = ['all', 'uniques', 'favorites', 'collection', 'owned'];

/** The tab in the URL: `?source=`, else the former search's `?tab=`, else « Toutes les cartes ». */
export function sourceFromParams(get: (key: string) => string | null): CardSource {
  const source = get('source');
  if (source && (SOURCES as readonly string[]).includes(source)) return source as CardSource;
  return LEGACY_TABS[get('tab') ?? ''] ?? 'all';
}

/** Lists: the key, `[]` added (`set[]`), as PHP and the site's search read them. */
const LISTS = {
  factions: 'faction[]',
  types: 'type[]',
  rarities: 'rarity[]',
  sets: 'set[]',
  subtypes: 'subtype[]',
  artists: 'artist[]',
  promoSets: 'promoSet[]',
} as const satisfies Partial<Record<keyof SearchFilters, string>>;

/** Texts and number expressions. */
const TEXTS = {
  q: 'q',
  text: 'text',
  mainCost: 'mainCost',
  recallCost: 'recallCost',
  forestPower: 'forest',
  mountainPower: 'mountain',
  oceanPower: 'ocean',
} as const satisfies Partial<Record<keyof SearchFilters, string>>;

/** Every key the browser writes, set to `null` when not written so that `navigate` takes them off the URL. */
export const SEARCH_URL_KEYS: readonly string[] = [...Object.values(LISTS), ...Object.values(TEXTS), 'hasNoEffect', 'hasZeroPower', 'prints', 'env', 'sort'];

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((v) => b.includes(v));
}

/** The query parameters of `filters` against the tab's defaults (`base`); the others `null`. */
export function filtersToParams(filters: SearchFilters, base: SearchFilters): Params {
  const params: Params = Object.fromEntries(SEARCH_URL_KEYS.map((k) => [k, null]));
  for (const [field, key] of Object.entries(LISTS) as [keyof typeof LISTS, string][]) {
    // A list emptied where the default has values: `set[]=` (an empty value), so that the reload does not bring them back.
    if (!sameList(filters[field], base[field])) params[key] = filters[field].length ? [...filters[field]] : [''];
  }
  for (const [field, key] of Object.entries(TEXTS) as [keyof typeof TEXTS, string][]) {
    const value = filters[field].trim();
    if (value) params[key] = value;
  }
  if (filters.noEffect) params['hasNoEffect'] = 'true';
  if (filters.zeroPower) params['hasZeroPower'] = 'true';
  if (filters.altArts !== 'off') params['prints'] = filters.altArts;
  if (filters.environment !== base.environment) params['env'] = filters.environment;
  if (filters.order !== base.order) params['sort'] = filters.order;
  return params;
}

/** The filters of the URL over the tab's defaults (`base`); a value it does not know is left out. */
export function filtersFromParams(base: SearchFilters, getAll: (key: string) => string[], get: (key: string) => string | null): SearchFilters {
  const f: SearchFilters = { ...base };
  const has = (key: string) => getAll(key).length > 0 || get(key) !== null;
  for (const [field, key] of Object.entries(LISTS) as [keyof typeof LISTS, string][]) {
    if (!has(key)) continue;
    let values = getAll(key).filter(Boolean);
    if (field === 'types') values = [...new Set(values.map(typeOptionOf).filter((t): t is string => !!t))];
    f[field] = values;
  }
  for (const [field, key] of Object.entries(TEXTS) as [keyof typeof TEXTS, string][]) {
    const value = get(key);
    if (value !== null) f[field] = value;
  }
  if (get('hasNoEffect') === 'true') f.noEffect = true;
  if (get('hasZeroPower') === 'true') f.zeroPower = true;
  const prints = get('prints');
  if (prints === 'with' || prints === 'only') f.altArts = prints;
  else f.altArts = legacyPrints(getAll('variation[]'), get('promo')) ?? f.altArts;
  const env = get('env');
  if (env === 'all' || env === 'frontier') f.environment = env;
  const sort = get('sort');
  if (sort && ORDER_OPTIONS.some((o) => o.value === sort)) f.order = sort as CardOrder;
  return f;
}

/** The former search's `variation[]` / `promo=true`: alt arts only, or every print. */
function legacyPrints(variations: string[], promo: string | null): AltArtsMode | undefined {
  const alt = variations.some((v) => v === 'alt-art' || v === 'promo');
  if (alt) return variations.includes('standard') ? 'with' : 'only';
  return promo === 'true' ? 'with' : undefined;
}
