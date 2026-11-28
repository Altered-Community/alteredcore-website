import type { ParamMap } from '@angular/router';
import { visibleFormats } from '../../core/formats';
import { FACTIONS } from '../../ui/metier';
import type { ContestSet } from './contest/contest-decks';
import { EMPTY_DECK_FILTERS, type DeckFilters, type DeckSort, type Visibility } from './deck-filters';

export type Tab = 'mine' | 'community' | 'contest';

export const TABS: readonly Tab[] = ['mine', 'community', 'contest'];

/** The site's `sort` values (`field:dir`) and Re:Builder's. */
const SITE_SORTS: Record<string, DeckSort> = {
  'updatedAt:desc': 'updated',
  'updatedAt:asc': 'updated-asc',
  'createdAt:desc': 'created',
  'createdAt:asc': 'created-asc',
  'name:asc': 'name',
  'name:desc': 'name-desc',
  'upvoteCount:desc': 'likes',
};

export const SORTS: { value: DeckSort; label: string }[] = [
  { value: 'updated', label: $localize`:@@decks.page.sortUpdated:Récemment modifié` },
  { value: 'updated-asc', label: $localize`:@@decks.page.sortUpdatedAsc:Plus ancien modifié` },
  { value: 'created', label: $localize`:@@decks.page.sortCreated:Récemment créé` },
  { value: 'created-asc', label: $localize`:@@decks.page.sortCreatedAsc:Plus ancien créé` },
  { value: 'likes', label: $localize`:@@decks.page.sortLikes:Les plus aimés` },
  { value: 'name', label: $localize`:@@decks.page.sortName:Nom` },
  { value: 'name-desc', label: $localize`:@@decks.page.sortNameDesc:Nom Z→A` },
];

export function tabFromParam(value: string | null): Tab | undefined {
  if (value === 'my') return 'mine';
  if (value === 'public') return 'community';
  return TABS.find((t) => t === value);
}

export function sortFromParam(value: string | null): DeckSort | undefined {
  if (!value) return undefined;
  return SITE_SORTS[value] ?? SORTS.find((s) => s.value === value)?.value;
}

/**
 * Decodes URL query parameters into initial filters and contest set for `tab`.
 * Understands legacy site links (`set=collection`, `visibility=1|0`, `sort=field:dir`, `tab=my|public`, `legal=all`).
 */
export function decodeDecksUrl(query: ParamMap, tab: Tab): { filters: DeckFilters; contestSet: ContestSet } {
  const factions = (query.get('faction') ?? '')
    .toUpperCase()
    .split(',')
    .filter((c) => FACTIONS.some((f) => f.code === c));
  const hero = query.get('hero') ?? '';
  const q = query.get('q') ?? '';
  if (tab === 'contest') {
    const contestSet: ContestSet = query.get('set') === 'all' || query.get('set') === 'collection' ? 'all' : 'winners';
    return { filters: { ...EMPTY_DECK_FILTERS, factions, hero, q }, contestSet };
  }
  const format = query.get('format') ?? '';
  const vis = query.get('visibility');
  const visibility: Visibility = vis === 'public' || vis === '1' ? 'public' : vis === 'private' || vis === '0' ? 'private' : 'all';
  return {
    contestSet: 'winners',
    filters: {
      q,
      format: visibleFormats().some((f) => f.value === format) ? format : '',
      hero: tab === 'community' ? hero.toUpperCase() : hero,
      visibility: tab === 'mine' ? visibility : 'all',
      status: tab === 'mine' && query.get('archived') === '1' ? 'archived' : 'active',
      factions,
      sort: sortFromParam(query.get('sort')) ?? 'updated',
      legalOnly: query.get('legal') !== 'all',
      tournament: tab === 'community' && query.get('tournament') === '1',
      card: tab === 'community' && /^ALT_/i.test(query.get('card') ?? '') ? (query.get('card') ?? '').toUpperCase() : '',
    },
  };
}

/** Encodes the active tab, filters and contest set into canonical query params (omitting defaults via `null`). */
export function encodeDecksUrl(tab: Tab, defaultTab: Tab, f: DeckFilters, contestSet: ContestSet): Record<string, string | null> {
  const common = { faction: f.factions.join(',') || null, hero: f.hero || null, q: f.q.trim() || null };
  if (tab === 'contest') {
    return { tab, set: contestSet === 'all' ? 'all' : null, ...common };
  }
  return {
    tab: tab === defaultTab ? null : tab,
    format: f.format || null,
    ...common,
    visibility: tab === 'mine' && f.visibility !== 'all' ? f.visibility : null,
    archived: tab === 'mine' && f.status === 'archived' ? '1' : null,
    sort: f.sort !== 'updated' ? f.sort : null,
    legal: tab === 'community' && !f.legalOnly ? 'all' : null,
    tournament: tab === 'community' && f.tournament ? '1' : null,
    card: tab === 'community' && f.card ? f.card : null,
  };
}

/** True when `current` query params already match `next` (no keys added, removed or changed). */
export function queryParamsEqual(current: ParamMap, next: Record<string, string | null>): boolean {
  return Object.entries(next).every(([k, v]) => current.get(k) === v) && current.keys.every((k) => k in next);
}

/** Query params for switching tabs (only `tab` is kept; the URL sync effect writes the tab's own filters). */
export function tabQueryParams(tab: Tab, defaultTab: Tab): { tab: Tab | null } {
  return { tab: tab === defaultTab ? null : tab };
}
