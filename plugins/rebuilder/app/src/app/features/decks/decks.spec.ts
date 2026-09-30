import type { DeckListItem } from '../../core/deck-view';
import { EMPTY_DECK_FILTERS, filterDecks, matchDecks } from './deck-filters';
import { parseDecklist } from './import-deck/import-deck.overlay';

const item = (p: Partial<DeckListItem>): DeckListItem => ({
  id: p.id ?? 'x',
  name: p.name ?? 'Deck',
  hero: p.hero ?? { reference: 'ALT_CORE_B_YZ_01_C', name: 'Moyo & Silk', faction: 'YZ' },
  format: p.format ?? 'standard',
  formatLabel: 'Standard All Uniques',
  formatTone: 'blue',
  legal: true,
  legality: { state: 'legal', rules: [], errors: [] },
  draft: false,
  isPublic: p.isPublic ?? false,
  author: null,
  total: 39,
  rarity: { C: 21, R: 15, U: 3, E: 0 },
  guest: true,
  updatedAt: p.updatedAt ?? '2026-01-01',
  createdAt: p.createdAt ?? '2026-01-01',
  likes: p.likes ?? 0,
  liked: false,
});

describe('filterDecks (Mes decks)', () => {
  const decks = [
    item({ id: 'a', name: 'Moyo Embrasement', updatedAt: '2026-03-01', likes: 12 }),
    item({ id: 'b', name: 'Frosty Moyo', format: 'frontier', isPublic: true, updatedAt: '2026-05-01' }),
    item({ id: 'c', name: 'Akesha Frontier', hero: { reference: 'ALT_CORE_B_AX_01_C', name: 'Akesha & Taru', faction: 'AX' }, updatedAt: '2026-04-01' }),
  ];

  it('sorts ascending: oldest update, oldest creation, name Z→A', () => {
    const ids = (sort: typeof EMPTY_DECK_FILTERS.sort) => filterDecks(decks, { ...EMPTY_DECK_FILTERS, sort }).map((d) => d.id);
    expect(ids('updated-asc')).toEqual(['a', 'c', 'b']);
    expect(ids('name-desc')).toEqual(['a', 'b', 'c']);
    expect(ids('created-asc')).toEqual(['a', 'c', 'b']);
  });

  it('sorts by last update by default', () => {
    expect(filterDecks(decks, EMPTY_DECK_FILTERS).map((d) => d.id)).toEqual(['b', 'c', 'a']);
  });

  it('filters by text (name or hero), format, visibility and faction', () => {
    expect(filterDecks(decks, { ...EMPTY_DECK_FILTERS, q: 'moyo' }).map((d) => d.id)).toEqual(['b', 'a']);
    expect(filterDecks(decks, { ...EMPTY_DECK_FILTERS, q: 'taru' }).map((d) => d.id)).toEqual(['c']);
    expect(filterDecks(decks, { ...EMPTY_DECK_FILTERS, format: 'frontier' }).map((d) => d.id)).toEqual(['b']);
    expect(filterDecks(decks, { ...EMPTY_DECK_FILTERS, visibility: 'private' }).map((d) => d.id)).toEqual(['c', 'a']);
    expect(filterDecks(decks, { ...EMPTY_DECK_FILTERS, factions: ['AX'] }).map((d) => d.id)).toEqual(['c']);
    expect(filterDecks(decks, { ...EMPTY_DECK_FILTERS, sort: 'name' }).map((d) => d.id)).toEqual(['c', 'b', 'a']);
    // Most liked first, ties by last update.
    expect(filterDecks(decks, { ...EMPTY_DECK_FILTERS, sort: 'likes' }).map((d) => d.id)).toEqual(['a', 'b', 'c']);
  });

  it('sorts « Récemment créé » by creation date, not by last update', () => {
    const created = [
      item({ id: 'old', createdAt: '2025-01-01', updatedAt: '2026-06-01' }),
      item({ id: 'new', createdAt: '2026-05-01', updatedAt: '2026-05-01' }),
      item({ id: 'mid', createdAt: '2025-06-01', updatedAt: '2025-06-01' }),
    ];
    expect(filterDecks(created, { ...EMPTY_DECK_FILTERS, sort: 'created' }).map((d) => d.id)).toEqual(['new', 'mid', 'old']);
    expect(filterDecks(created, EMPTY_DECK_FILTERS).map((d) => d.id)).toEqual(['old', 'new', 'mid']);
  });
});

describe('matchDecks (concours)', () => {
  it('filters without reordering', () => {
    const decks = [
      item({ id: 'z', name: 'Zeta', updatedAt: '2025-01-01' }),
      item({ id: 'a', name: 'Alpha', updatedAt: '2026-01-01' }),
      item({ id: 'x', name: 'Other', hero: { reference: 'ALT_CORE_B_AX_01_C', name: 'Akesha & Taru', faction: 'AX' } }),
    ];
    expect(matchDecks(decks, { ...EMPTY_DECK_FILTERS, factions: ['YZ'], sort: 'name' }).map((d) => d.id)).toEqual(['z', 'a']);
  });
});

describe('parseDecklist (import)', () => {
  it('reads "qty ref", "qty x ref" and "ref x qty" lines and merges duplicates', () => {
    expect(
      parseDecklist('1 ALT_CORE_B_YZ_01_C\n3 x alt_core_b_yz_10_c\nALT_CORE_B_YZ_10_C x1\n\n# comment\n2 ALT_EOLE_B_YZ_111_R2'),
    ).toEqual([
      { reference: 'ALT_CORE_B_YZ_01_C', quantity: 1 },
      { reference: 'ALT_CORE_B_YZ_10_C', quantity: 4 },
      { reference: 'ALT_EOLE_B_YZ_111_R2', quantity: 2 },
    ]);
  });
});
