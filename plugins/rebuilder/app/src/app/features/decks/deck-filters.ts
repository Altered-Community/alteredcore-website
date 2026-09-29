import { type DeckListItem } from '../../core/deck-view';
import { uiLocale } from '../../core/i18n';

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

/** The decks that match the filters, in the order of `items` (`f.sort` is not used). */
export function matchDecks(items: DeckListItem[], f: DeckFilters): DeckListItem[] {
  const q = f.q.trim().toLowerCase();
  return items.filter(
    (d) =>
      (!q || d.name.toLowerCase().includes(q) || (d.hero?.name ?? '').toLowerCase().includes(q)) &&
      (!f.format || d.format === f.format) &&
      (!f.hero || d.hero?.name === f.hero) &&
      (f.visibility === 'all' || (f.visibility === 'public') === d.isPublic) &&
      (!f.factions.length || (!!d.hero && f.factions.includes(d.hero.faction))),
  );
}

/** The decks that match the filters, sorted by `f.sort`; ties go to the most recently modified. */
export function filterDecks(items: DeckListItem[], f: DeckFilters): DeckListItem[] {
  const time = (d: string) => Date.parse(d) || 0;
  const byUpdate = (a: DeckListItem, b: DeckListItem) => time(b.updatedAt) - time(a.updatedAt);
  return matchDecks(items, f).sort((a, b) => {
    switch (f.sort) {
      case 'name':
        return a.name.localeCompare(b.name, uiLocale());
      case 'likes':
        return b.likes - a.likes || byUpdate(a, b);
      case 'created':
        return time(b.createdAt) - time(a.createdAt) || byUpdate(a, b);
      case 'updated':
        return byUpdate(a, b);
    }
  });
}
