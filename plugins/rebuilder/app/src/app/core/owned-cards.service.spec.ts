import { defaultFilters } from './card-filters';
import { favoriteRarities, ownedParams } from './owned-cards.service';

describe('Favoris rarities', () => {
  const f = defaultFilters('favorites');

  it('lists the Uniques by default and sends no rarity filter when every rarity is chosen', () => {
    expect(f.rarities).toEqual(['COMMON', 'RARE', 'EXALTED', 'UNIQUE']);
    expect(f.sets).toContain('COREKS');
    expect(defaultFilters('all').sets).not.toContain('COREKS');
    expect(ownedParams('favorites', f, ['AX'], 1, 36, 'standard').getAll('rarity[]')).toBeNull();
  });

  it('leaves the Uniques out in a No Unique format while « légales » is on', () => {
    expect(favoriteRarities(f, 'nuc')).toEqual(['COMMON', 'RARE', 'EXALTED']);
    expect(ownedParams('favorites', f, ['AX'], 1, 36, 'nuc').getAll('rarity[]')).toEqual(['COMMON', 'RARE', 'EXALTED']);
    expect(favoriteRarities({ ...f, legalOnly: false }, 'nuc')).toContain('UNIQUE');
    expect(favoriteRarities({ ...f, rarities: ['UNIQUE'] }, 'nuc')).toEqual([]);
  });
});

describe('Collection and digital ownership query', () => {
  it('sends every value of a list filter in the array form', () => {
    for (const source of ['collection', 'owned'] as const) {
      const p = ownedParams(source, defaultFilters(source), ['AX', 'BR'], 1, 36);
      expect(p.getAll('rarity[]')).toEqual(['COMMON', 'RARE', 'EXALTED']);
      expect(p.getAll('faction[]')).toEqual(['AX', 'BR']);
      expect(p.getAll('cardType[]')?.length).toBe(4);
      expect(p.getAll('cardSet[]')).toEqual(defaultFilters(source).sets);
      expect(p.has('rarity')).toBe(false);
    }
  });
});
