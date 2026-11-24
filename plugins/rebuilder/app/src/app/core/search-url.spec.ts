import { convertToParamMap, type Params } from '@angular/router';
import { environment } from '../../environments/environment';
import { defaultFilters } from './card-filters';
import { SUBTYPES } from './card-vocabulary';
import { filtersFromParams, filtersToParams, sourceFromParams } from './search-url';

/** The params `navigate` would write, `null` left out, then read back as the URL gives them. */
function roundTrip(params: Params) {
  const written = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== null));
  const map = convertToParamMap(written);
  return { get: (k: string) => map.get(k), getAll: (k: string) => map.getAll(k) };
}

describe('card browser URL', () => {
  it('writes nothing for the default filters', () => {
    const base = defaultFilters('all');
    const params = filtersToParams(base, base);
    expect(Object.values(params).every((v) => v === null)).toBe(true);
  });

  it('keeps the filters through a reload', () => {
    const base = defaultFilters('all');
    const f = {
      ...base,
      q: 'Kuraokami',
      factions: ['OR'],
      types: ['HERO', 'TOKEN'],
      sets: [],
      subtypes: ['ANIMAL'],
      forestPower: '0',
      noEffect: true,
      zeroPower: true,
      artists: ['Zero Wen'],
      altArts: 'only' as const,
      promoSets: ['EOLECB'],
      order: 'name-asc' as const,
    };
    const params = filtersToParams(f, base);
    expect(params['set[]']).toEqual(['']);
    expect(params['forest']).toBe('0');
    const url = roundTrip(params);
    expect(filtersFromParams(base, url.getAll, url.get)).toEqual(f);
  });

  it('opens the links of the site’s former card search (including ?tab=unique)', () => {
    const map = convertToParamMap({
      tab: 'unique',
      'faction[]': ['AX', 'BR'],
      'type[]': ['TOKEN_MANA', 'PERMANENT', 'NOPE'],
      'variation[]': ['alt-art'],
      hasNoEffect: 'true',
      sort: 'set_date_desc',
      mountain: '2+',
    });
    expect(sourceFromParams((k) => map.get(k))).toBe('all');
    const f = filtersFromParams(defaultFilters('all'), (k) => map.getAll(k), (k) => map.get(k));
    expect(f).toMatchObject({
      factions: ['AX', 'BR'],
      rarities: ['UNIQUE'],
      types: ['TOKEN', 'LANDMARK_PERMANENT'],
      altArts: 'only',
      noEffect: true,
      mountainPower: '2+',
      order: 'setDate-desc',
    });
    expect(f.sets).toContain('COREKS');
  });

  it('accepts custom Frontier season format ids from ?format= URLs', () => {
    const map = convertToParamMap({ format: 'frontier' });
    expect(filtersFromParams(defaultFilters('all'), (k) => map.getAll(k), (k) => map.get(k)).environment).toBe('frontier');
    const saved = environment.uniquesFrontierFormat;
    environment.uniquesFrontierFormat = 'frontier_s04';
    try {
      const seasonMap = convertToParamMap({ format: 'frontier_s04' });
      expect(filtersFromParams(defaultFilters('all'), (k) => seasonMap.getAll(k), (k) => seasonMap.get(k)).environment).toBe('frontier');
    } finally {
      environment.uniquesFrontierFormat = saved;
    }
  });

  it('prefers ?source= and falls back to « Toutes les cartes »', () => {
    expect(sourceFromParams((k) => ({ source: 'owned', tab: 'unique' })[k] ?? null)).toBe('owned');
    expect(sourceFromParams((k) => ({ source: 'nope' })[k] ?? null)).toBe('all');
    expect(sourceFromParams(() => null)).toBe('all');
  });
});

describe('subtypes', () => {
  it('leaves out the « #Bureaucrate# » entry of the data', () => {
    expect(SUBTYPES.map((s) => s.code)).not.toContain('BUREAUCRATOOF');
    expect(SUBTYPES.map((s) => s.code)).toContain('BUREAUCRAT');
  });
});
