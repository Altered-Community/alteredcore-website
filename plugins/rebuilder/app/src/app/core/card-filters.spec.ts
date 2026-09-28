import { buildCardsSearchParams } from './cards-api.service';
import {
  ALL_CARDS_SETS,
  UNIQUES_SETS,
  activeFilterCount,
  defaultFilters,
  effectSlotsFor,
  filterChips,
  newEffectBlock,
  parseCostExpression,
  removeChip,
  setsFor,
  toSearchParams,
} from './card-filters';

describe('parseCostExpression', () => {
  it('expands single values, ranges and open ranges', () => {
    expect(parseCostExpression('')).toEqual([]);
    expect(parseCostExpression('3')).toEqual([3]);
    expect(parseCostExpression('1-3')).toEqual([1, 2, 3]);
    expect(parseCostExpression('3-1')).toEqual([1, 2, 3]);
    expect(parseCostExpression('10+')).toEqual([10, 11, 12]);
    expect(parseCostExpression('1, 4-5, 3')).toEqual([1, 3, 4, 5]);
  });

  it('rejects invalid expressions', () => {
    expect(parseCostExpression('abc')).toBeNull();
    expect(parseCostExpression('1-')).toBeNull();
  });
});

describe('effectSlotsFor', () => {
  const block = (t: number[], c: number[], e: number[]) => ({
    ...newEffectBlock(),
    triggers: t.map((id) => ({ id, text: `t${id}` })),
    conditions: c.map((id) => ({ id, text: `c${id}` })),
    effects: e.map((id) => ({ id, text: `e${id}` })),
  });

  it('expands one block to the OR cross product (0 = any)', () => {
    const { slots, mode } = effectSlotsFor([block([1, 2], [], [7])]);
    expect(mode).toBe('or');
    expect(slots).toEqual([
      { trigger: 1, condition: 0, effect: 7 },
      { trigger: 2, condition: 0, effect: 7 },
    ]);
  });

  it('ANDs several blocks and ignores empty ones', () => {
    const { slots, mode } = effectSlotsFor([block([1], [], []), block([], [], []), block([], [5], [])]);
    expect(mode).toBe('and');
    expect(slots).toEqual([
      { trigger: 1, condition: 0, effect: 0 },
      { trigger: 0, condition: 5, effect: 0 },
    ]);
  });

  it('ignores empty criteria and empty blocks in the request', () => {
    const filters = { ...defaultFilters('uniques'), effects: [block([17], [], []), block([], [], [])] };
    const hp = buildCardsSearchParams(toSearchParams(filters, 'uniques', 'AX', 1, 24));
    expect(hp.keys().filter((k) => k.startsWith('effectSlot'))).toEqual(['effectSlot[0][trigger]']);
    expect(hp.get('effectSlot[0][trigger]')).toBe('17');
    expect(hp.has('effectSlotMode')).toBe(false);
  });

  it('sends « Sans condition » as the empty condition id, not as « any »', () => {
    const any = effectSlotsFor([block([17], [], [])]).slots;
    const none = effectSlotsFor([
      { ...block([17], [], []), conditions: [{ id: 191, text: 'Sans condition' }] },
    ]).slots;
    expect(any).toEqual([{ trigger: 17, condition: 0, effect: 0 }]);
    expect(none).toEqual([{ trigger: 17, condition: 191, effect: 0 }]);
    expect(buildCardsSearchParams({ effectSlots: none }).get('effectSlot[0][condition]')).toBe('191');
    expect(buildCardsSearchParams({ effectSlots: any }).has('effectSlot[0][condition]')).toBe(false);
  });
});

describe('toSearchParams', () => {
  it('maps the "all cards" filters and hero faction', () => {
    const f = { ...defaultFilters('all'), q: 'rok', mainCost: '1-2', recallCost: '4' };
    const p = toSearchParams(f, 'all', 'YZ', 2, 36);
    expect(p.page).toBe(2);
    expect(p.itemsPerPage).toBe(36);
    expect(p.factions).toEqual(['YZ']);
    expect(p.rarities).toEqual(['COMMON', 'RARE', 'EXALTED']);
    expect(p.variations).toEqual(['standard']);
    expect(p.mainCosts).toEqual([1, 2]);
    expect(p.recallCosts).toEqual([4]);
    expect(p.q).toBe('rok');
    expect(p.effectSlots).toEqual([]);
    expect(toSearchParams({ ...f, rarities: [] }, 'all', 'YZ', 1, 36).rarities).toEqual(['COMMON', 'RARE', 'EXALTED']);
  });

  it('forces UNIQUE rarity, drops types and adds Frontier + effect slots for uniques', () => {
    const f = { ...defaultFilters('uniques'), environment: 'frontier' as const, effects: [{ ...newEffectBlock(), triggers: [{ id: 17, text: 'Au Crépuscule' }] }] };
    const p = toSearchParams(f, 'uniques', 'AX', 1, 24);
    expect(p.rarities).toEqual(['UNIQUE']);
    expect(p.types).toEqual([]);
    expect(p.variations).toEqual([]);
    expect(p.gameplayFormats).toEqual(['frontier']);
    expect(p.effectSlots).toEqual([{ trigger: 17, condition: 0, effect: 0 }]);
  });

  it('leaves out `locale` for uniques only, so the cards API answers from Meilisearch', () => {
    expect(toSearchParams(defaultFilters('uniques'), 'uniques', 'AX', 1, 36).locale).toBeUndefined();
    expect(toSearchParams(defaultFilters('all'), 'all', 'AX', 1, 36).locale).toBe('fr');
  });
});

describe('filter chips', () => {
  it('lists default chips as in the mockups (6 extensions · C · R · E · 4 types)', () => {
    const chips = filterChips(defaultFilters('all'), 'all');
    expect(chips.map((c) => c.label)).toEqual(['6 extensions', 'C · R · E', '4 types']);
    expect(activeFilterCount(defaultFilters('all'), 'all')).toBe(3);
  });

  it('shows the uniques environment chip without counting "Toutes" as active', () => {
    const f = defaultFilters('uniques');
    expect(filterChips(f, 'uniques').map((c) => c.label)).toEqual(['7 extensions', 'Toutes']);
    expect(activeFilterCount(f, 'uniques')).toBe(1);
    expect(activeFilterCount({ ...f, environment: 'frontier' }, 'uniques')).toBe(2);
  });

  it('removes one criterion per chip', () => {
    const f = { ...defaultFilters('all'), mainCost: '3', noEffect: true };
    expect(removeChip(f, 'sets').sets).toEqual([]);
    expect(removeChip(f, 'mainCost').mainCost).toBe('');
    expect(removeChip(f, 'noEffect').noEffect).toBe(false);
    expect(filterChips(f, 'all').some((c) => c.label === 'Coût main : 3')).toBe(true);
  });

  it('exposes the right extension lists per source', () => {
    expect(setsFor('all').map((s) => s.reference)).toEqual(ALL_CARDS_SETS);
    expect(setsFor('uniques').map((s) => s.reference).sort()).toEqual([...UNIQUES_SETS].sort());
    expect(defaultFilters('all').sets).not.toContain('FUGUE');
  });
});

describe('faction filter (card browser)', () => {
  it('sends the selected factions when no faction is locked', () => {
    const f = { ...defaultFilters('all'), factions: ['AX', 'LY'] };
    expect(toSearchParams(f, 'all', null, 1, 36).factions).toEqual(['AX', 'LY']);
  });

  it('keeps the locked faction (deck hero) over the selection', () => {
    const f = { ...defaultFilters('all'), factions: ['AX'] };
    expect(toSearchParams(f, 'all', 'YZ', 1, 36).factions).toEqual(['YZ']);
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
    expect(defaultFilters('uniques').factions).toEqual([]);
  });
});
