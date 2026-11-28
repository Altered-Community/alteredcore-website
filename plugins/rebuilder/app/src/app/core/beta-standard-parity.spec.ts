import { convertToParamMap } from '@angular/router';
import { buildUnifiedSearchParams, effectTypeRank, toAbilityRefs } from './card-catalog.service';
import {
  cardTypeCodes,
  defaultFilters,
  filterSetsWithPromos,
  searchedPromoSets,
  toSearchParams,
  typeOptionsFor,
  variationCodes,
  withRarities,
} from './card-filters';
import { PROMO_SETS, VARIATIONS } from './card-vocabulary';
import { filtersFromParams, sourceFromParams } from './search-url';

function paramsToSortedEntries(query: string): [string, string][] {
  const sp = new URLSearchParams(query);
  return [...sp.entries()].sort(([ak, av], [bk, bv]) => ak.localeCompare(bk) || av.localeCompare(bv));
}

describe('Beta (Re:Builder) ↔ Standard (core-altered-cards) behavioral parity', () => {
  it('orders effects Character → Spell → rest (Permanents, Heroes…), alphabetical within each tier', () => {
    const rawCatalog = [
      { alteredId: 1, text: { fr: 'Alpha repère' }, cardTypes: ['LANDMARK_PERMANENT'] },
      { alteredId: 2, text: { fr: 'Zebra sort' }, cardTypes: ['SPELL'], spellOnly: true },
      { alteredId: 3, text: { fr: 'Alpha sort' }, cardTypes: ['SPELL'], spellOnly: true },
      { alteredId: 4, text: { fr: 'Zebra perso' }, cardTypes: ['CHARACTER'] },
      { alteredId: 5, text: { fr: 'Beta mixte' }, cardTypes: ['CHARACTER', 'SPELL'] },
      { alteredId: 6, text: { fr: 'Beta héros' }, cardTypes: ['HERO'] },
      { alteredId: 7, text: { fr: 'Gamma legacy sort' }, spellOnly: true },
    ];

    expect(rawCatalog.map((r) => effectTypeRank(r))).toEqual([2, 1, 1, 0, 0, 2, 1]);
    expect(toAbilityRefs(rawCatalog).map((r) => r.text)).toEqual([
      'Beta mixte',
      'Zebra perso',
      'Alpha sort',
      'Gamma legacy sort',
      'Zebra sort',
      'Alpha repère',
      'Beta héros',
    ]);
  });

  it('produces the exact /api/v2/search query shape of standard CardSearchQuery for unified search', () => {
    const betaFilters = {
      ...defaultFilters('all'),
      q: 'kelon',
      factions: ['AX'],
      sets: ['CORE', 'ALIZE'],
      rarities: ['COMMON', 'UNIQUE'],
      types: ['CHARACTER', 'SPELL'],
      subtypes: ['ELEMENTAL'],
      mainCost: '1-3',
      recallCost: '>=13',
      forestPower: '2',
      noEffect: true,
      environment: 'frontier' as const,
      effects: [{ id: 'e1', triggers: [{ id: 22, text: 'H' }], conditions: [], effects: [{ id: 90, text: 'O' }] }],
      support: { id: 'support', triggers: [], conditions: [], effects: [{ id: 41, text: 'S' }] },
      order: 'mainCost-asc' as const,
    };
    const qs = buildUnifiedSearchParams(toSearchParams(betaFilters, null, 2, 36)).toString();
    expect(paramsToSortedEntries(qs)).toEqual(
      paramsToSortedEntries(
        [
          'page=2',
          'limit=36',
          'sort=mainCost%3Aasc',
          'faction[]=AX',
          'cardType[]=CHARACTER',
          'cardType[]=SPELL',
          'rarity[]=COMMON',
          'rarity[]=UNIQUE',
          'set[]=CORE',
          'set[]=ALIZE',
          'subTypes[]=ELEMENTAL',
          'variation[]=standard',
          'mainCost[]=1',
          'mainCost[]=2',
          'mainCost[]=3',
          'recallCost[]=13',
          'recallCost[]=14',
          'recallCost[]=15',
          'forestPower[]=2',
          'hasNoEffect=true',
          'effect[0][t]=22',
          'effect[0][o]=90',
          'support[o]=41',
          'format=frontier',
          'q=kelon',
        ].join('&'),
      ),
    );
  });

  it('matches standard numeric filter grammar across exact, list, range, bounds, and >15 clamping', () => {
    const cases: [string, string[]][] = [
      ['3', ['mainCost[]=3']],
      ['1, 3', ['mainCost[]=1', 'mainCost[]=3']],
      ['1-3', ['mainCost[]=1', 'mainCost[]=2', 'mainCost[]=3']],
      ['12+', ['mainCost[]=12', 'mainCost[]=13', 'mainCost[]=14', 'mainCost[]=15']],
      ['2-', ['mainCost[]=0', 'mainCost[]=1', 'mainCost[]=2']],
      ['<3', ['mainCost[]=0', 'mainCost[]=1', 'mainCost[]=2']],
      ['>=13', ['mainCost[]=13', 'mainCost[]=14', 'mainCost[]=15']],
      ['20', ['mainCost[gt]=15']],
      ['>15', ['mainCost[gt]=15']],
    ];
    for (const [expr, expected] of cases) {
      const hp = buildUnifiedSearchParams(toSearchParams({ ...defaultFilters('all'), mainCost: expr }, null, 1, 36));
      const actual = hp
        .keys()
        .filter((k) => k.startsWith('mainCost'))
        .flatMap((k) => (hp.getAll(k) ?? []).map((v) => `${k}=${v}`))
        .sort();
      expect(actual).toEqual(expected.slice().sort());
    }
  });

  it('matches standard card types in browse vs builder modes and TOKEN expansion', () => {
    expect(typeOptionsFor(false).map((t) => t.value)).toEqual(['CHARACTER', 'SPELL', 'LANDMARK_PERMANENT', 'EXPEDITION_PERMANENT']);
    expect(typeOptionsFor(true).map((t) => t.value)).toEqual([
      'CHARACTER',
      'SPELL',
      'LANDMARK_PERMANENT',
      'EXPEDITION_PERMANENT',
      'HERO',
      'TOKEN',
    ]);
    expect(cardTypeCodes(['TOKEN'])).toEqual(['TOKEN', 'TOKEN_LANDMARK_PERMANENT', 'TOKEN_MANA']);
  });

  it('matches standard UNIQUE + COREKS auto-include and legacy ?tab=unique URL mapping', () => {
    const base = defaultFilters('all');
    expect(base.sets).toContain('CORE');
    expect(base.sets).not.toContain('COREKS');
    expect(withRarities(base, [...base.rarities, 'UNIQUE']).sets).toContain('COREKS');

    const map = convertToParamMap({ tab: 'unique' });
    expect(sourceFromParams((k) => map.get(k))).toBe('all');
    const parsed = filtersFromParams(defaultFilters('all'), (k) => map.getAll(k), (k) => map.get(k));
    expect(parsed.rarities).toEqual(['UNIQUE']);
    expect(parsed.sets).toContain('COREKS');
  });

  it('matches standard promo editions & variations semantics across Standard / Toutes / Alt arts', () => {
    const base = { ...defaultFilters('all'), sets: ['DUSTER'], altArts: 'off' as const, promoSets: ['DUSTEROP'] };
    expect(variationCodes(base)).toEqual(['standard']);
    expect(filterSetsWithPromos(base)).toEqual(['DUSTER']);

    const withAll = { ...base, altArts: 'with' as const, promoSets: [] };
    expect(variationCodes(withAll)).toEqual(VARIATIONS.map((v) => v.code));
    const dusterPromos = PROMO_SETS.filter((p) => p.parent === 'DUSTER').map((p) => p.code);
    expect(searchedPromoSets(withAll)).toEqual(dusterPromos);
    expect(filterSetsWithPromos(withAll)).toEqual(['DUSTER', ...dusterPromos]);

    const narrowed = { ...base, altArts: 'only' as const, promoSets: ['DUSTERCB'] };
    expect(variationCodes(narrowed)).toEqual(['alt-art', 'promo']);
    expect(filterSetsWithPromos(narrowed)).toEqual(['DUSTER', 'DUSTERCB']);
  });
});
