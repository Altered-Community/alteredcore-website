import { buildUniquesParams } from './uniques-api.service';
import {
  ALL_CARDS_SETS,
  UNIQUES_SETS,
  activeFilterCount,
  defaultFilters,
  filterChips,
  newEffectBlock,
  parseCostExpression,
  removeChip,
  setsFor,
  toSearchParams,
  toUniquesQuery,
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

const block = (t: number[], c: number[], e: number[]) => ({
  ...newEffectBlock(),
  triggers: t.map((id) => ({ id, text: `t${id}` })),
  conditions: c.map((id) => ({ id, text: `c${id}` })),
  effects: e.map((id) => ({ id, text: `e${id}` })),
});

describe('toUniquesQuery (Uniques search API)', () => {
  it('ORs the values of a criterion and ANDs the effect blocks, empty ones left out', () => {
    // « (Joué depuis la Main ou Joué de partout) · Sans condition · Piochez » and « Piochez »: the case
    // the cards API could not express (it kept the first value of each block).
    const f = { ...defaultFilters('uniques'), effects: [block([22, 24], [191], [90]), block([], [], []), block([], [], [90])] };
    const hp = buildUniquesParams(toUniquesQuery(f, 'AX'), null, 36);
    expect(hp.get('effect[0][t]')).toBe('22,24');
    expect(hp.get('effect[0][c]')).toBe('191');
    expect(hp.get('effect[0][o]')).toBe('90');
    expect(hp.get('effect[1][o]')).toBe('90');
    expect(hp.has('effect[1][t]')).toBe(false);
    // « Piochez » covers the first block: the card needs a second drawing ability, not the same one.
    expect(hp.get('effect[1][matchCount]')).toBe('2');
    expect(hp.has('effect[0][matchCount]')).toBe(false);
    expect(hp.keys().filter((k) => k.startsWith('effect['))).toHaveLength(5);
    expect(hp.get('effectMode')).toBe('and');
  });

  it('sends no effectMode for a single block', () => {
    const hp = buildUniquesParams(toUniquesQuery({ ...defaultFilters('uniques'), effects: [block([17], [], [])] }, null), null, 36);
    expect(hp.get('effect[0][t]')).toBe('17');
    expect(hp.has('effectMode')).toBe(false);
  });

  it('maps name, hero faction, sets, costs and Frontier; the cursor only after the first page', () => {
    const f = { ...defaultFilters('uniques'), q: ' kelon ', mainCost: '1-2', recallCost: '4', environment: 'frontier' as const };
    const q = toUniquesQuery(f, 'AX');
    expect(q).toMatchObject({ name: 'kelon', reference: undefined, factions: ['AX'], sets: UNIQUES_SETS, mainCosts: [1, 2], recallCosts: [4], format: 'frontier' });
    const first = buildUniquesParams(q, null, 36);
    expect(first.get('limit')).toBe('36');
    expect(first.has('cursor')).toBe(false);
    expect(first.getAll('faction[]')).toEqual(['AX']);
    expect(first.getAll('set[]')).toEqual(UNIQUES_SETS);
    expect(first.getAll('mainCost[]')).toEqual(['1', '2']);
    expect(first.get('format')).toBe('frontier');
    expect(buildUniquesParams(q, 3591698, 36).get('cursor')).toBe('3591698');
    expect(toUniquesQuery(defaultFilters('uniques'), null).format).toBeUndefined();
  });

  it('turns an exact reference into a card lookup', () => {
    const q = toUniquesQuery({ ...defaultFilters('uniques'), q: 'alt_coreks_b_ax_04_u_1' }, null);
    expect(q.reference).toBe('ALT_COREKS_B_AX_04_U_1');
    expect(q.name).toBeUndefined();
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
    expect(toSearchParams({ ...f, rarities: [] }, 'YZ', 1, 36).rarities).toEqual(['COMMON', 'RARE', 'EXALTED']);
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
    expect(defaultFilters('uniques').factions).toEqual([]);
  });
});
