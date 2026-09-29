import { contestDecksFor, loadContestDecks, toContestItem } from './contest-decks';

describe('Starter Deck Contest', () => {
  it('lists the bundled entries as legal 39-card Standard No Unique decks', async () => {
    const all = await loadContestDecks();
    expect(all.length).toBe(186);
    expect(contestDecksFor(all, 'winners').length).toBe(27);
    expect(contestDecksFor(all, 'all')).toBe(all);
    expect(all.every((d) => d.format === 'nuc' && d.legal && d.total === 39 && d.hero)).toBe(true);
  });

  it('maps an entry to a deck list item', () => {
    const item = toContestItem({
      id: 'id-1',
      name: 'Akesha B',
      winner: true,
      stats: { hero: { reference: 'ALT_CORE_B_YZ_01_C', name: 'Akesha & Taru' }, byRarity: { C: 24, R: 15, U: 0, E: 0 } },
    });
    expect(item).toMatchObject({
      id: 'id-1',
      name: 'Akesha B',
      winner: true,
      hero: { reference: 'ALT_CORE_B_YZ_01_C', name: 'Akesha & Taru', faction: 'YZ' },
      rarity: { C: 24, R: 15, U: 0, E: 0 },
      total: 39,
      legal: true,
      isPublic: true,
    });
  });
});
