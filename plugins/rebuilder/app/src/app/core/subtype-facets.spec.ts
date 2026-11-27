import { defaultFilters } from './card-filters';
import { subtypeFacetParams } from './subtype-facets';

describe('subtype facets query', () => {
  it('counts « Toutes les cartes » with its filters, the subtypes left out', () => {
    const f = { ...defaultFilters('all'), factions: ['YZ'], subtypes: ['MAGE'], q: 'kadigir' };
    const hp = subtypeFacetParams('all', f, null)!;
    expect(hp.getAll('faction[]')).toEqual(['YZ']);
    expect(hp.get('q')).toBe('kadigir');
    expect(hp.getAll('cardType[]')).toEqual(['CHARACTER', 'SPELL', 'LANDMARK_PERMANENT', 'EXPEDITION_PERMANENT']);
    expect(hp.has('subTypes[]')).toBe(false);
  });

  it('counts the Uniques when selected in rarity filter, in the editor hero’s faction', () => {
    const hp = subtypeFacetParams('all', { ...defaultFilters('all'), rarities: ['UNIQUE'], subtypes: ['MAGE'] }, 'LY')!;
    expect(hp.getAll('rarity[]')).toEqual(['UNIQUE']);
    expect(hp.getAll('faction[]')).toEqual(['LY']);
    expect(hp.has('subTypes[]')).toBe(false);
  });

  it('has no count for the account tabs (the site’s endpoints)', () => {
    expect(subtypeFacetParams('collection', defaultFilters('collection'), null)).toBeNull();
    expect(subtypeFacetParams('owned', defaultFilters('owned'), null)).toBeNull();
    expect(subtypeFacetParams('favorites', defaultFilters('favorites'), null)).toBeNull();
  });
});
