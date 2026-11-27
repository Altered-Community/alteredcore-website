import {
  addTier,
  emptyRanking,
  moveHero,
  moveTier,
  normalizeRanking,
  removeTier,
  shiftHero,
  tierOf,
  unrankAll,
  updateTier,
  type Ranking,
} from './ranking';

function ranking(rows: Record<string, string[]>): Ranking {
  const r = emptyRanking();
  return { ...r, tiers: r.tiers.map((t) => ({ ...t, heroes: rows[t.name] ?? [] })) };
}

const heroesOf = (r: Ranking, name: string) => r.tiers.find((t) => t.name === name)?.heroes;

describe('moveHero', () => {
  it('ranks a hero from the pool at the given place', () => {
    const r = moveHero(ranking({ S: ['a', 'b'] }), 'x', 't0', 1);
    expect(heroesOf(r, 'S')).toEqual(['a', 'x', 'b']);
  });

  it('reorders inside a tier, the index being the final place', () => {
    const r = ranking({ S: ['a', 'b', 'c', 'd'] });
    expect(heroesOf(moveHero(r, 'a', 't0', 2), 'S')).toEqual(['b', 'c', 'a', 'd']);
    expect(heroesOf(moveHero(r, 'd', 't0', 0), 'S')).toEqual(['d', 'a', 'b', 'c']);
  });

  it('moves between tiers and back to the pool', () => {
    let r = moveHero(ranking({ S: ['a', 'b'], A: ['c'] }), 'a', 't1', 0);
    expect(heroesOf(r, 'S')).toEqual(['b']);
    expect(heroesOf(r, 'A')).toEqual(['a', 'c']);
    r = moveHero(r, 'c', null);
    expect(tierOf(r, 'c')).toBeNull();
  });

  it('appends without an index and ignores an unknown tier', () => {
    const r = ranking({ S: ['a'] });
    expect(heroesOf(moveHero(r, 'b', 't0'), 'S')).toEqual(['a', 'b']);
    expect(moveHero(r, 'b', 'nope')).toBe(r);
  });
});

describe('shiftHero', () => {
  it('moves one place and stops at the ends', () => {
    const r = ranking({ S: ['a', 'b', 'c'] });
    expect(heroesOf(shiftHero(r, 'b', -1), 'S')).toEqual(['b', 'a', 'c']);
    expect(heroesOf(shiftHero(r, 'b', 1), 'S')).toEqual(['a', 'c', 'b']);
    expect(shiftHero(r, 'a', -1)).toBe(r);
    expect(shiftHero(r, 'z', 1)).toBe(r);
  });
});

describe('tiers', () => {
  it('renames and recolours, keeping the old name when the new one is blank', () => {
    let r = updateTier(emptyRanking(), 't0', { name: '  Top  ', color: 'blue' });
    expect(r.tiers[0]).toMatchObject({ name: 'Top', color: 'blue' });
    r = updateTier(r, 't0', { name: '   ' });
    expect(r.tiers[0].name).toBe('Top');
  });

  it('adds, moves and removes tiers; removed heroes return to the pool', () => {
    let r = addTier(ranking({ S: ['a'] }), 'E', 'e');
    expect(r.tiers.map((t) => t.name)).toEqual(['S', 'A', 'B', 'C', 'D', 'E']);
    r = moveTier(r, 'e', -1);
    expect(r.tiers.map((t) => t.name)).toEqual(['S', 'A', 'B', 'C', 'E', 'D']);
    r = removeTier(r, 't0');
    expect(tierOf(r, 'a')).toBeNull();
  });

  it('keeps the last tier', () => {
    const one: Ranking = { title: '', tiers: [emptyRanking().tiers[0]] };
    expect(removeTier(one, 't0')).toBe(one);
  });

  it('unranks every hero but keeps the tiers', () => {
    const r = unrankAll(ranking({ S: ['a'], B: ['b'] }));
    expect(r.tiers.every((t) => t.heroes.length === 0)).toBe(true);
    expect(r.tiers).toHaveLength(5);
  });
});

describe('normalizeRanking', () => {
  it('falls back to the default tiers', () => {
    expect(normalizeRanking(null)).toEqual(emptyRanking());
    expect(normalizeRanking({ tiers: [] }).tiers).toHaveLength(5);
  });

  it('drops duplicates and invalid values', () => {
    const r = normalizeRanking({
      title: 42,
      tiers: [
        { id: 'a', name: 'S', color: 'pink', heroes: ['x', 'x', 3] },
        { id: 'a', name: 'dup', color: 'red', heroes: [] },
        { id: 'b', name: '', color: 'red', heroes: ['x', 'y'] },
      ],
    });
    expect(r.title).toBe('');
    expect(r.tiers).toEqual([
      { id: 'a', name: 'S', color: 'grey', heroes: ['x'] },
      { id: 'b', name: '?', color: 'red', heroes: ['y'] },
    ]);
  });
});
