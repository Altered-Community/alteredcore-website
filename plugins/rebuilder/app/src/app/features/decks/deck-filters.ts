import { type DeckListItem } from '../../core/deck-view';

export type Visibility = 'all' | 'public' | 'private';

export type DeckSort = 'updated' | 'created' | 'name' | 'likes';

export interface DeckFilters {
  q: string;
  format: string;
  hero: string;
  visibility: Visibility;
  factions: string[];
  sort: DeckSort;
}

export const EMPTY_DECK_FILTERS: DeckFilters = { q: '', format: '', hero: '', visibility: 'all', factions: [], sort: 'updated' };

export function filterDecks(items: DeckListItem[], f: DeckFilters): DeckListItem[] {
  const q = f.q.trim().toLowerCase();
  const out = items.filter(
    (d) =>
      (!q || d.name.toLowerCase().includes(q) || (d.hero?.name ?? '').toLowerCase().includes(q)) &&
      (!f.format || d.format === f.format) &&
      (!f.hero || d.hero?.name === f.hero) &&
      (f.visibility === 'all' || (f.visibility === 'public') === d.isPublic) &&
      (!f.factions.length || (!!d.hero && f.factions.includes(d.hero.faction))),
  );
  return out.sort((a, b) =>
    f.sort === 'name'
      ? a.name.localeCompare(b.name, 'fr')
      : (f.sort === 'likes' ? b.likes - a.likes : 0) || (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0),
  );
}
