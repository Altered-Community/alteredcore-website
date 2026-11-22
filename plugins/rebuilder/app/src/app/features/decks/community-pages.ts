import { toDeckListItem, type DeckListItem } from '../../core/deck-view';
import type { PublicDeckPage, PublicDeckQuery } from '../../core/decks-api.service';
import type { DeckFilters, DeckSort } from './deck-filters';

export const COMMUNITY_PAGE_SIZE = 24;

/**
 * Query of the community tab. `GET /api/decks/public` takes a single `faction`: with two factions or more, none is
 * sent and `factions` filters the loaded pages here (the infinite scroll keeps loading pages while the list is short).
 * The API has no legality filter either: `legalOnly` drops the illegal decks of the loaded pages here.
 */
export type CommunityQuery = PublicDeckQuery & { factions?: string[]; legalOnly?: boolean };

export interface CommunityState {
  items: DeckListItem[];
  /** API total minus the illegal decks dropped from the pages loaded so far (`legalOnly`); `null` when unknown (several factions). */
  total: number | null;
  dropped: number;
  page: number;
  lastPage: number;
}

export const EMPTY_COMMUNITY: CommunityState = { items: [], total: null, dropped: 0, page: 0, lastPage: 1 };

const API_ORDER: Record<DeckSort, Pick<PublicDeckQuery, 'order' | 'dir'>> = {
  updated: { order: 'updatedAt', dir: 'desc' },
  'updated-asc': { order: 'updatedAt', dir: 'asc' },
  created: { order: 'createdAt', dir: 'desc' },
  'created-asc': { order: 'createdAt', dir: 'asc' },
  likes: { order: 'upvoteCount', dir: 'desc' },
  name: { order: 'name', dir: 'asc' },
  'name-desc': { order: 'name', dir: 'desc' },
};

/** Visibility does not reach the API; the hero is a reference there (community tab). */
export function toCommunityQuery(f: DeckFilters): CommunityQuery {
  return {
    itemsPerPage: COMMUNITY_PAGE_SIZE,
    name: f.q.trim() || undefined,
    faction: f.factions.length === 1 ? f.factions[0] : undefined,
    factions: f.factions.length > 1 ? [...f.factions].sort() : undefined,
    hero: f.hero || undefined,
    format: f.format || undefined,
    legalOnly: f.legalOnly || undefined,
    ...API_ORDER[f.sort],
  };
}

/** Adds a loaded page to the list of `query`. With `legalOnly`, illegal decks are dropped here (the server-computed `legal` flag). */
export function addCommunityPage(current: CommunityState, query: CommunityQuery | undefined, page: number, res: PublicDeckPage): CommunityState {
  const members = res.member ?? [];
  const shown = members.filter((d) => !query?.legalOnly || d.legal).map(toDeckListItem);
  const factions = query?.factions;
  const kept = factions ? shown.filter((d) => !!d.hero && factions.includes(d.hero.faction)) : shown;
  const dropped = (page === 1 ? 0 : current.dropped) + members.length - shown.length;
  const seen = new Set(page === 1 ? [] : current.items.map((d) => d.id));
  const items = [...(page === 1 ? [] : current.items), ...kept.filter((d) => !seen.has(d.id))];
  return {
    items: query?.order === 'updatedAt' && query.dir !== 'asc' ? byLastUpdate(items) : items,
    dropped,
    total: factions || res.totalItems == null ? null : res.totalItems - dropped,
    page,
    lastPage: res.lastPage ?? page,
  };
}

/**
 * The API sorts `updatedAt` DESC with never-modified decks (`updatedAt` null) first, whatever their age. Their date is the
 * creation date here (`lastModified`), so a stable sort of the pages loaded so far moves them to their place; later
 * pages are older than every dated deck already shown, so the order stays right as pages load.
 */
function byLastUpdate(items: DeckListItem[]): DeckListItem[] {
  return [...items].sort((a, b) => (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0));
}
