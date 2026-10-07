import { defaultFilters } from './card-filters';
import { listedRarities, ownedParams } from './owned-cards.service';

describe('Favoris and Propriété numérique rarities', () => {
  it('lists the Uniques by default and sends no rarity filter when every rarity is chosen', () => {
    for (const source of ['favorites', 'owned'] as const) {
      const f = defaultFilters(source);
      expect(f.rarities).toEqual(['COMMON', 'RARE', 'EXALTED', 'UNIQUE']);
      expect(ownedParams(source, f, ['AX'], 1, 36, 'standard').getAll('rarity[]')).toBeNull();
    }
    expect(defaultFilters('favorites').sets).toContain('COREKS');
    expect(defaultFilters('owned').sets).toContain('COREKS');
    expect(defaultFilters('all').sets).not.toContain('COREKS');
  });

  it('sends the chosen rarities, Uniques included', () => {
    const f = { ...defaultFilters('owned'), rarities: ['RARE', 'UNIQUE'] };
    expect(ownedParams('owned', f, ['AX'], 1, 36).getAll('rarity[]')).toEqual(['RARE', 'UNIQUE']);
  });

  it('leaves the Uniques out in a No Unique format while « légales » is on', () => {
    for (const source of ['favorites', 'owned'] as const) {
      const f = defaultFilters(source);
      expect(listedRarities(source, f, 'nuc')).toEqual(['COMMON', 'RARE', 'EXALTED']);
      expect(ownedParams(source, f, ['AX'], 1, 36, 'nuc').getAll('rarity[]')).toEqual(['COMMON', 'RARE', 'EXALTED']);
      expect(listedRarities(source, { ...f, legalOnly: false }, 'nuc')).toContain('UNIQUE');
      expect(listedRarities(source, { ...f, rarities: ['UNIQUE'] }, 'nuc')).toEqual([]);
    }
  });
});

describe('Collection and digital ownership query', () => {
  it('sends every value of a list filter in the array form', () => {
    for (const source of ['collection', 'owned'] as const) {
      const p = ownedParams(source, { ...defaultFilters(source), rarities: ['COMMON', 'RARE'] }, ['AX', 'BR'], 1, 36);
      expect(p.getAll('rarity[]')).toEqual(['COMMON', 'RARE']);
      expect(p.getAll('faction[]')).toEqual(['AX', 'BR']);
      expect(p.getAll('cardType[]')?.length).toBe(4);
      expect(p.getAll('cardSet[]')).toEqual(defaultFilters(source).sets);
      expect(p.has('rarity')).toBe(false);
    }
  });
});
