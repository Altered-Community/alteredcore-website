import { defaultFilters } from './card-filters';
import { favoriteRarities, ownedParams } from './owned-cards.service';

describe('Favoris rarities', () => {
  const f = defaultFilters('favorites');

  it('lists the Uniques by default and sends no rarity filter when every rarity is chosen', () => {
    expect(f.rarities).toEqual(['COMMON', 'RARE', 'EXALTED', 'UNIQUE']);
    expect(f.sets).not.toContain('COREKS');
    expect(ownedParams('favorites', f, ['AX'], 1, 36, 'standard').getAll('rarity[]')).toBeNull();
  });

  it('leaves the Uniques out in a No Unique format while « légales » is on', () => {
    expect(favoriteRarities(f, 'nuc')).toEqual(['COMMON', 'RARE', 'EXALTED']);
    expect(ownedParams('favorites', f, ['AX'], 1, 36, 'nuc').getAll('rarity[]')).toEqual(['COMMON', 'RARE', 'EXALTED']);
    expect(favoriteRarities({ ...f, legalOnly: false }, 'nuc')).toContain('UNIQUE');
    expect(favoriteRarities({ ...f, rarities: ['UNIQUE'] }, 'nuc')).toEqual([]);
  });
});
