import type { Deck } from '../../core/models';
import { EMPTY_COMMUNITY, addCommunityPage, toCommunityQuery } from './community-pages';
import { EMPTY_DECK_FILTERS } from './deck-filters';

const deck = (id: string, faction: string, legal = true): Deck => ({
  id,
  name: id,
  legal,
  hero: { reference: `ALT_CORE_B_${faction}_01_C`, name: `Hero ${faction}`, faction },
  stats: { totalCards: 39 },
});

describe('toCommunityQuery', () => {
  it('sends a single faction to the API, and filters two or more here', () => {
    expect(toCommunityQuery({ ...EMPTY_DECK_FILTERS, factions: ['AX'] })).toMatchObject({ faction: 'AX', factions: undefined });
    expect(toCommunityQuery({ ...EMPTY_DECK_FILTERS, factions: ['YZ', 'AX'] })).toMatchObject({ faction: undefined, factions: ['AX', 'YZ'] });
    expect(toCommunityQuery({ ...EMPTY_DECK_FILTERS, sort: 'created' }).order).toBe('createdAt');
  });

  it('sends the hero reference to the API', () => {
    expect(toCommunityQuery({ ...EMPTY_DECK_FILTERS, hero: 'ALT_CORE_B_AX_01_C' }).hero).toBe('ALT_CORE_B_AX_01_C');
    expect(toCommunityQuery(EMPTY_DECK_FILTERS).hero).toBeUndefined();
  });
});

describe('addCommunityPage', () => {
  it('drops illegal decks from the API total', () => {
    const query = toCommunityQuery({ ...EMPTY_DECK_FILTERS, sort: 'likes' });
    const state = addCommunityPage(EMPTY_COMMUNITY, query, 1, { member: [deck('a', 'AX'), deck('b', 'YZ', false)], totalItems: 10, currentPage: 1, lastPage: 5 });
    expect(state.items.map((d) => d.id)).toEqual(['a']);
    expect(state.total).toBe(9);
  });

  it('keeps the decks of the selected factions across pages, with no total', () => {
    const query = toCommunityQuery({ ...EMPTY_DECK_FILTERS, sort: 'likes', factions: ['AX', 'LY'] });
    const p1 = addCommunityPage(EMPTY_COMMUNITY, query, 1, { member: [deck('a', 'AX'), deck('b', 'YZ'), deck('c', 'LY', false)], totalItems: 6, currentPage: 1, lastPage: 2 });
    expect(p1.items.map((d) => d.id)).toEqual(['a']);
    expect(p1.total).toBeNull();
    const p2 = addCommunityPage(p1, query, 2, { member: [deck('d', 'MU'), deck('e', 'LY'), deck('a', 'AX')], totalItems: 6, currentPage: 2, lastPage: 2 });
    expect(p2.items.map((d) => d.id)).toEqual(['a', 'e']);
    expect(p2).toMatchObject({ total: null, page: 2, lastPage: 2 });
  });
});
