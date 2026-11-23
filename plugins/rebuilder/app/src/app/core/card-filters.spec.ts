import { environment } from '../../environments/environment';
import { buildUniquesParams, buildUnifiedSearchParams } from './uniques-api.service';
import {
  cardTypeCodes,
  searchedPromoSets,
  typeOptionOf,
  typeOptionsFor,
  ALL_CARDS_SETS,
  ORDER_OPTIONS,
  activeFilterCount,
  defaultFilters,
  effectAt,
  emptySupport,
  filterChips,
  hasInvalidNumericFilters,
  newEffectBlock,
  parseCostExpression,
  rarityOptionsFor,
  removeChip,
  setsFor,
  toSearchParams,
  withEditedEffect,
} from './card-filters';

describe('parseCostExpression', () => {
  it('expands single values, ranges and open ranges', () => {
    expect(parseCostExpression('')).toEqual([]);
    expect(parseCostExpression('3')).toEqual([3]);
    expect(parseCostExpression('1-3')).toEqual([1, 2, 3]);
    expect(parseCostExpression('1 - 3')).toEqual([1, 2, 3]);
    expect(parseCostExpression('1–3')).toEqual([1, 2, 3]);
    expect(parseCostExpression('3-1')).toEqual([1, 2, 3]);
    expect(parseCostExpression('10+')).toEqual([10, 11, 12, 13, 14, 15]);
    expect(parseCostExpression('13-15')).toEqual([13, 14, 15]);
    expect(parseCostExpression('1, 4-5, 3')).toEqual([1, 3, 4, 5]);
    expect(parseCostExpression('1-3, 5')).toEqual([1, 2, 3, 5]);
  });

  it('reads the site\'s bounds: <, >, <=, >= and « n- »', () => {
    expect(parseCostExpression('<3')).toEqual([0, 1, 2]);
    expect(parseCostExpression('<=2')).toEqual([0, 1, 2]);
    expect(parseCostExpression('>10')).toEqual([11, 12, 13, 14, 15]);
    expect(parseCostExpression('>=11')).toEqual([11, 12, 13, 14, 15]);
    expect(parseCostExpression('2-')).toEqual([0, 1, 2]);
  });

  it('rejects invalid expressions', () => {
    expect(parseCostExpression('abc')).toBeNull();
    expect(parseCostExpression('<')).toBeNull();
  });
});

describe('advanced filters (cards API)', () => {
  it('sends powers, subtypes, alt arts with promo editions, another faction', () => {
    const f = {
      ...defaultFilters('all'),
      forestPower: '>=4',
      subtypes: ['ANIMAL'],
      altArts: 'with' as const,
      promoSets: ['DUSTEROP'],
      otherFactions: ['LY'],
    };
    const p = toSearchParams(f, 'AX', 1, 36);
    expect(p).toMatchObject({ forestPowers: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], subtypes: ['ANIMAL'], factions: ['LY'] });
    expect(p.variations).toEqual(['standard', 'alt-art', 'promo', 'kickstarter', 'serialized']);
    expect(p.sets).toContain('DUSTEROP');
    expect(toSearchParams(defaultFilters('all'), 'AX', 1, 36)).toMatchObject({ factions: ['AX'], variations: ['standard'] });
    expect(filterChips(f, 'all').map((c) => c.id)).toEqual(expect.arrayContaining(['forestPower', 'subtypes', 'altArts', 'otherFactions']));
  });

  it('lists the alt arts alone (variations alt-art and promo) with the promo editions of the sets', () => {
    const f = { ...defaultFilters('all'), altArts: 'only' as const, promoSets: ['EOLECB'] };
    const p = toSearchParams(f, null, 1, 36);
    expect(p.variations).toEqual(['alt-art', 'promo']);
    expect(p.sets).toContain('EOLECB');
    expect(filterChips(f, 'all').find((c) => c.id === 'altArts')?.label).toBe('Alt arts uniquement');
    expect(removeChip(f, 'altArts')).toMatchObject({ altArts: 'off', promoSets: [] });
  });

  it('searches the support effect on « Toutes les cartes », with its own chip, and edits it in place', () => {
    const block = { ...emptySupport(), triggers: [{ id: 432, text: 'Lorsque vous jouez un Sort' }] };
    const f = { ...defaultFilters('all'), support: block };
    expect(toSearchParams(f, null, 1, 36).support).toEqual({ triggers: [432], conditions: [], effects: [] });
    expect(filterChips(f, 'all').map((c) => c.id)).toContain('support');
    expect(filterChips(defaultFilters('all'), 'all').map((c) => c.id)).not.toContain('support');
    expect(removeChip(f, 'support').support).toEqual(emptySupport());
    expect(effectAt(f, 'support')).toBe(block);
    expect(withEditedEffect(defaultFilters('all'), 'support', block).support).toBe(block);
    // « Annuler » leaves it as it was; a main effect just added and left empty goes.
    expect(withEditedEffect(f, 'support', undefined)).toBe(f);
    const added = { ...defaultFilters('all'), effects: [newEffectBlock()] };
    expect(withEditedEffect(added, 0, undefined).effects).toEqual([]);
  });

  it('searches the card text on « Toutes les cartes »', () => {
    const f = { ...defaultFilters('all'), text: '  piochez une carte ' };
    expect(toSearchParams(f, null, 1, 36).effectText).toBe('piochez une carte');
    expect(toSearchParams(defaultFilters('all'), null, 1, 36).effectText).toBeUndefined();
    expect(filterChips(f, 'all').map((c) => c.id)).toContain('text');
    expect(removeChip(f, 'text').text).toBe('');
  });
});

const block = (t: number[], c: number[], e: number[]) => ({
  ...newEffectBlock(),
  triggers: t.map((id) => ({ id, text: `t${id}` })),
  conditions: c.map((id) => ({ id, text: `c${id}` })),
  effects: e.map((id) => ({ id, text: `e${id}` })),
});

describe('unified search effects & formats (toSearchParams + buildUnifiedSearchParams)', () => {
  it('ORs the values of a criterion and ANDs the effect blocks, empty ones left out', () => {
    const f = { ...defaultFilters('all'), effects: [block([22, 24], [191], [90]), block([], [], []), block([], [], [90])] };
    const hp = buildUnifiedSearchParams(toSearchParams(f, 'AX', 1, 36));
    expect(hp.get('effect[0][t]')).toBe('22,24');
    expect(hp.get('effect[0][c]')).toBe('191');
    expect(hp.get('effect[0][o]')).toBe('90');
    expect(hp.get('effect[1][o]')).toBe('90');
    expect(hp.has('effect[1][t]')).toBe(false);
    expect(hp.get('effect[1][matchCount]')).toBe('2');
    expect(hp.has('effect[0][matchCount]')).toBe(false);
    expect(hp.keys().filter((k) => k.startsWith('effect['))).toHaveLength(5);
    expect(hp.get('effectMode')).toBe('and');
  });

  it('sends no effectMode for a single block', () => {
    const hp = buildUnifiedSearchParams(toSearchParams({ ...defaultFilters('all'), effects: [block([17], [], [])] }, null, 1, 36));
    expect(hp.get('effect[0][t]')).toBe('17');
    expect(hp.has('effectMode')).toBe(false);
  });

  it('maps q, hero faction, sets, costs and Frontier into unified search params', () => {
    const f = { ...defaultFilters('all'), q: ' kelon ', mainCost: '1-2', recallCost: '4', environment: 'frontier' as const };
    const p = toSearchParams(f, 'AX', 1, 36);
    expect(p).toMatchObject({ q: 'kelon', factions: ['AX'], mainCosts: [1, 2], recallCosts: [4], format: 'frontier' });
    const hp = buildUnifiedSearchParams(p);
    expect(hp.get('page')).toBe('1');
    expect(hp.get('limit')).toBe('36');
    expect(hp.get('q')).toBe('kelon');
    expect(hp.getAll('faction[]')).toEqual(['AX']);
    expect(hp.getAll('mainCost[]')).toEqual(['1', '2']);
    expect(hp.get('format')).toBe('frontier');
    expect(toSearchParams(defaultFilters('all'), null, 1, 36).format).toBeUndefined();
  });

  it('sends the site\'s current Frontier season id (AlteredCore.uniquesFrontierFormat)', () => {
    const env = environment as { uniquesFrontierFormat: string };
    const saved = env.uniquesFrontierFormat;
    env.uniquesFrontierFormat = 'frontier_s04';
    try {
      const p = toSearchParams({ ...defaultFilters('all'), environment: 'frontier' as const }, null, 1, 36);
      expect(buildUnifiedSearchParams(p).get('format')).toBe('frontier_s04');
    } finally {
      env.uniquesFrontierFormat = saved;
    }
  });

  it('sends biome powers cleanly and renders their chips', () => {
    const f = { ...defaultFilters('all'), forestPower: '3', mountainPower: '2-3', environment: 'frontier' as const };
    const p = toSearchParams(f, 'AX', 1, 36);
    expect(p.forestPowers).toEqual([3]);
    expect(p.mountainPowers).toEqual([2, 3]);
    const hp = buildUnifiedSearchParams(p);
    expect(hp.getAll('forestPower[]')).toEqual(['3']);
    expect(hp.getAll('mountainPower[]')).toEqual(['2', '3']);
    expect(filterChips(f, 'all').map((c) => c.id)).toEqual(expect.arrayContaining(['forestPower', 'mountainPower', 'environment']));
  });

  it('still builds /api/v2/cards params cleanly for buildUniquesParams', () => {
    const hp = buildUniquesParams({ factions: ['AX'], sets: ['CORE'], mainCosts: [], recallCosts: [], effects: [] }, 3591698, 36);
    expect(hp.get('cursor')).toBe('3591698');
  });
});

describe('toSearchParams (cards API)', () => {
  it('maps the "all cards" filters and hero faction', () => {
    const f = { ...defaultFilters('all'), q: 'rok', mainCost: '1-2', recallCost: '4' };
    const p = toSearchParams(f, 'YZ', 2, 36);
    expect(p.page).toBe(2);
    expect(p.itemsPerPage).toBe(36);
    expect(p.factions).toEqual(['YZ']);
    expect(p.rarities).toEqual(['COMMON', 'RARE', 'EXALTED']);
    expect(p.variations).toEqual(['standard']);
    expect(p.mainCosts).toEqual([1, 2]);
    expect(p.recallCosts).toEqual([4]);
    expect(p.q).toBe('rok');
    expect(p.locale).toBe('fr');
    expect(toSearchParams({ ...f, rarities: [] }, 'YZ', 1, 36).rarities).toEqual([]);
    expect(toSearchParams({ ...f, rarities: ['UNIQUE'] }, 'YZ', 1, 36).rarities).toEqual(['UNIQUE']);
    expect(toSearchParams({ ...f, rarities: ['COMMON', 'UNIQUE'] }, 'YZ', 1, 36).rarities).toEqual(['COMMON', 'UNIQUE']);
  });

  it('exposes UNIQUE rarity on "all" while keeping C/R/E as defaults and supports number-desc', () => {
    expect(rarityOptionsFor().map((r) => r.value)).toEqual(['COMMON', 'RARE', 'EXALTED', 'UNIQUE']);
    expect(defaultFilters('all').rarities).toEqual(['COMMON', 'RARE', 'EXALTED']);
    expect(ORDER_OPTIONS.map((o) => o.value)).toContain('number-desc');

    const uOnly = filterChips({ ...defaultFilters('all'), rarities: ['UNIQUE'] }, 'all');
    expect(uOnly.find((c) => c.id === 'rarities')?.label).toBe('U');

    const mixed = filterChips({ ...defaultFilters('all'), rarities: ['COMMON', 'UNIQUE'] }, 'all');
    expect(mixed.find((c) => c.id === 'rarities')?.label).toBe('C · U');
  });
});

describe('filter chips', () => {
  it('lists default chips as in the mockups (6 extensions · C · R · E · 4 types)', () => {
    const chips = filterChips(defaultFilters('all'), 'all');
    expect(chips.map((c) => c.label)).toEqual(['6 extensions', 'C · R · E', '4 types']);
    expect(activeFilterCount(defaultFilters('all'), 'all')).toBe(3);
  });

  it('shows Frontier chip only when Frontier environment is selected', () => {
    const f = defaultFilters('all');
    expect(filterChips(f, 'all').some((c) => c.id === 'environment')).toBe(false);
    expect(activeFilterCount(f, 'all')).toBe(3);
    const frontier = { ...f, environment: 'frontier' as const };
    expect(filterChips(frontier, 'all').find((c) => c.id === 'environment')?.label).toBe('Frontier');
    expect(activeFilterCount(frontier, 'all')).toBe(4);
  });

  it('removes one criterion per chip', () => {
    const f = { ...defaultFilters('all'), mainCost: '3', noEffect: true };
    expect(removeChip(f, 'sets').sets).toEqual([]);
    expect(removeChip(f, 'mainCost').mainCost).toBe('');
    expect(removeChip(f, 'noEffect').noEffect).toBe(false);
    expect(filterChips(f, 'all').some((c) => c.label === 'Coût main : 3')).toBe(true);
  });

  it('exposes all sets cleanly on the unified tab', () => {
    expect(setsFor().map((s) => s.reference)).toEqual(ALL_CARDS_SETS);
    expect(defaultFilters('all').sets).not.toContain('FUGUE');
    expect(defaultFilters('all').sets).not.toContain('COREKS');
  });
});

describe('faction filter (card browser)', () => {
  it('sends the selected factions when no faction is locked', () => {
    const f = { ...defaultFilters('all'), factions: ['AX', 'LY'] };
    expect(toSearchParams(f, null, 1, 36).factions).toEqual(['AX', 'LY']);
  });

  it('keeps the locked faction (deck hero) over the selection', () => {
    const f = { ...defaultFilters('all'), factions: ['AX'] };
    expect(toSearchParams(f, 'YZ', 1, 36).factions).toEqual(['YZ']);
  });

  it('shows one chip named after the faction, or the count, and removes it', () => {
    expect(filterChips({ ...defaultFilters('all'), factions: ['MU'] }, 'all')[0]).toEqual({ id: 'factions', label: 'Muna' });
    const two = { ...defaultFilters('all'), factions: ['MU', 'OR'] };
    expect(filterChips(two, 'all')[0].label).toBe('2 factions');
    expect(activeFilterCount(two, 'all')).toBe(4);
    expect(removeChip(two, 'factions').factions).toEqual([]);
  });

  it('starts with no faction selected', () => {
    expect(defaultFilters('all').factions).toEqual([]);
  });
});

describe('Favoris filters', () => {
  it('gives chips only for the faction, set and rarity filters the favorites search applies', () => {
    const f = { ...defaultFilters('favorites'), q: 'kelon', mainCost: '5', types: ['SPELL'], rarities: ['RARE'], sets: ['CORE'], otherFactions: ['BR'] };
    expect(filterChips(f, 'favorites').map((c) => c.id).sort()).toEqual(['otherFactions', 'rarities', 'sets']);
    expect(activeFilterCount(f, 'favorites')).toBe(3);
  });
});

describe('numeric validation', () => {
  it('detects invalid numeric expressions except on favorites where they are disabled', () => {
    const bad = { ...defaultFilters('all'), mainCost: 'abc' };
    expect(hasInvalidNumericFilters(bad, 'all')).toBe(true);
    expect(hasInvalidNumericFilters(bad, 'favorites')).toBe(false);
    expect(hasInvalidNumericFilters({ ...bad, mainCost: '1-3' }, 'all')).toBe(false);
  });

  it('drops discrete numbers > 15 and maps >15 stats cleanly', () => {
    expect(parseCostExpression('20')).toEqual([]);
    expect(parseCostExpression('2, 20')).toEqual([2]);
    const p = toSearchParams({ ...defaultFilters('all'), mainCost: '20', recallCost: '>15' }, null, 1, 20);
    expect(p.mainCosts).toEqual([16]);
    expect(p.recallCosts).toEqual([16]);
    const hp = buildUnifiedSearchParams(p);
    expect(hp.get('mainCost[gt]')).toBe('15');
    expect(hp.get('recallCost[gt]')).toBe('15');
  });

  it('forwards subtypes, noEffect and otherFactions on unified queries and shows their chips', () => {
    const f = {
      ...defaultFilters('all'),
      subtypes: ['ANIMAL', 'ROBOT'],
      noEffect: true,
      otherFactions: ['OR'],
    };
    const p = toSearchParams(f, 'AX', 1, 20);
    expect(p.factions).toEqual(['OR']);
    expect(p.subtypes).toEqual(['ANIMAL', 'ROBOT']);
    expect(p.hasNoEffect).toBe(true);

    const hp = buildUnifiedSearchParams(p);
    expect(hp.getAll('subTypes[]')).toEqual(['ANIMAL', 'ROBOT']);
    expect(hp.get('costRelation')).toBeNull();
    expect(hp.get('hasNoEffect')).toBe('true');

    const chipIds = filterChips(f, 'all').map((c) => c.id);
    expect(chipIds).toEqual(expect.arrayContaining(['subtypes', 'noEffect', 'otherFactions']));
  });

  it('omits unsupported noEffect, zero power, artists and collection altArts chips on account tabs', () => {
    const base = { ...defaultFilters('owned'), sets: [], rarities: [], types: [], noEffect: true, zeroPower: true, artists: ['Zero Wen'], altArts: 'with' as const };
    expect(filterChips(base, 'owned').map((c) => c.id)).toEqual(['altArts']);
    expect(filterChips({ ...base }, 'collection').map((c) => c.id)).toEqual([]);
  });
});

describe('search feedback (types, promo editions, zero power, artists)', () => {
  it('offers heroes and tokens with mana in the card browser only, and sends their cardType codes', () => {
    expect(typeOptionsFor(false).map((t) => t.value)).toEqual(['CHARACTER', 'SPELL', 'LANDMARK_PERMANENT', 'EXPEDITION_PERMANENT']);
    expect(typeOptionsFor(true).map((t) => t.value)).toEqual(['CHARACTER', 'SPELL', 'LANDMARK_PERMANENT', 'EXPEDITION_PERMANENT', 'HERO', 'TOKEN']);
    expect(defaultFilters('all').types).toEqual(['CHARACTER', 'SPELL', 'LANDMARK_PERMANENT', 'EXPEDITION_PERMANENT']);
    const p = toSearchParams({ ...defaultFilters('all'), types: ['HERO', 'TOKEN'] }, null, 1, 36);
    expect(p.types).toEqual(['HERO', 'TOKEN', 'TOKEN_LANDMARK_PERMANENT', 'TOKEN_MANA']);
    expect(cardTypeCodes(['TOKEN', 'TOKEN'])).toEqual(['TOKEN', 'TOKEN_LANDMARK_PERMANENT', 'TOKEN_MANA']);
    expect(typeOptionOf('TOKEN_MANA')).toBe('TOKEN');
    expect(typeOptionOf('PERMANENT')).toBe('LANDMARK_PERMANENT');
  });

  it('searches every promo edition of the chosen sets until some are picked', () => {
    const f = { ...defaultFilters('all'), sets: ['DUSTER'], altArts: 'with' as const, promoSets: [] };
    expect(searchedPromoSets(f)).toEqual(['DUSTEROP', 'DUSTERTOP', 'DUSTERCB', 'WCS26']);
    expect(searchedPromoSets({ ...f, promoSets: ['DUSTERCB'] })).toEqual(['DUSTERCB']);
    // An edition picked for a set taken off the search: back to all the editions of the chosen sets.
    expect(searchedPromoSets({ ...f, promoSets: ['EOLECB'] })).toEqual(['DUSTEROP', 'DUSTERTOP', 'DUSTERCB', 'WCS26']);
    expect(toSearchParams({ ...f, altArts: 'off' }, null, 1, 36).sets).toEqual(['DUSTER']);
  });

  it('sends hasZeroPower and artist[] on « Toutes les cartes » with their chips', () => {
    const f = { ...defaultFilters('all'), zeroPower: true, artists: ['Zero Wen', 'HuoMiao Studio'] };
    const p = toSearchParams(f, null, 1, 36);
    expect(p).toMatchObject({ hasZeroPower: true, artists: ['Zero Wen', 'HuoMiao Studio'] });
    const hp = buildUnifiedSearchParams(p);
    expect(hp.get('hasZeroPower')).toBe('true');
    expect(hp.getAll('artist[]')).toEqual(['Zero Wen', 'HuoMiao Studio']);
    expect(buildUnifiedSearchParams(toSearchParams(defaultFilters('all'), null, 1, 36)).has('hasZeroPower')).toBe(false);
    const chips = filterChips(f, 'all');
    expect(chips.find((c) => c.id === 'zeroPower')?.label).toBe('Au moins un 0');
    expect(chips.find((c) => c.id === 'artists')?.label).toBe('2 artistes');
    expect(removeChip(f, 'zeroPower').zeroPower).toBe(false);
    expect(removeChip(f, 'artists').artists).toEqual([]);
    expect(filterChips(f, 'collection').map((c) => c.id)).not.toContain('zeroPower');
  });
});
