import { factionFromReference, toDeckListItem, type DeckListItem } from '../../../core/deck-view';
import type { Deck } from '../../../core/models';

/**
 * Starter Deck Contest entries: a snapshot bundled with the plugin (`starter-deck-contest.json`, the
 * same file as `core-altered-cards/data/starter-deck-contest-collection.json`). The decks themselves
 * are public decks of the decks API, opened by id like any other deck.
 */
export interface ContestEntry {
  id: string;
  name: string;
  winner: boolean;
  stats: {
    hero: { reference: string; name: string };
    byRarity: { C: number; R: number; U: number; E: number };
  };
}

/** Every entry is a 39-card Standard No Unique deck. */
const CONTEST_DECK_SIZE = 39;

export function toContestItem(entry: ContestEntry): DeckListItem {
  const { hero } = entry.stats;
  const deck: Deck = {
    id: entry.id,
    name: entry.name,
    format: 'nuc',
    isPublic: true,
    legal: true,
    hero: { reference: hero.reference, name: hero.name, faction: factionFromReference(hero.reference) },
    stats: { totalCards: CONTEST_DECK_SIZE, hero, byRarity: entry.stats.byRarity },
  };
  return { ...toDeckListItem(deck), winner: entry.winner };
}

/** The snapshot is a lazy chunk: only the contest tab downloads it. */
export async function loadContestDecks(): Promise<DeckListItem[]> {
  const data = (await import('./starter-deck-contest.json')).default as { decks: ContestEntry[] };
  return data.decks.map(toContestItem);
}

export type ContestSet = 'winners' | 'all';

export function contestDecksFor(items: DeckListItem[], set: ContestSet): DeckListItem[] {
  return set === 'winners' ? items.filter((d) => d.winner) : items;
}
