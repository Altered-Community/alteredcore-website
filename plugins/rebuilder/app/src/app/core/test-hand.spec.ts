import { HAND_SIZE, commitMana, drawCard, handPool, handSummary, moveCard, newGame, shuffled, toggleManaPick } from './test-hand';
import type { HydratedLine } from './models';

const lines: HydratedLine[] = [
  { quantity: 1, card: { reference: 'ALT_CORE_B_YZ_01_C', cardType: { reference: 'HERO' } } },
  { quantity: 3, card: { reference: 'ALT_CORE_B_YZ_10_C', cardType: { reference: 'SPELL' }, mainCost: 2 } },
  { quantity: 2, card: { reference: 'ALT_CORE_B_YZ_11_C', cardType: { reference: 'CHARACTER' }, mainCost: 3 } },
  { quantity: 2, card: { reference: 'ALT_CORE_B_YZ_12_C', cardType: { reference: 'LANDMARK_PERMANENT' }, mainCost: 1 } },
];

describe('test hand', () => {
  it('puts every non-hero copy in the pool once', () => {
    const pool = handPool(lines);
    expect(pool).toHaveLength(7);
    expect(new Set(pool.map((c) => c.id)).size).toBe(7);
    expect(pool.some((c) => c.card.cardType?.reference === 'HERO')).toBe(false);
  });

  it('shuffles without losing or duplicating a card', () => {
    const items = [...Array(20).keys()];
    let seed = 1;
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const out = shuffled(items, random);
    expect(out).not.toEqual(items);
    expect([...out].sort((a, b) => a - b)).toEqual(items);
    expect(items).toEqual([...Array(20).keys()]);
  });

  it('sums up an opening hand by type with its average cost', () => {
    const hand = handPool(lines).slice(0, HAND_SIZE);
    expect(handSummary(hand)).toEqual({ characters: 2, spells: 3, permanents: 1, averageCost: 2.2 });
    expect(handSummary([]).averageCost).toBeNull();
  });
});

describe('game mode', () => {
  const order = [5, 3, 8, 1, 0, 9, 2, 4, 6, 7];

  it('deals 6, picks 3 for mana, then plays', () => {
    let s = newGame(order);
    expect(s).toMatchObject({ phase: 'setup', hand: [5, 3, 8, 1, 0, 9], deck: [2, 4, 6, 7] });
    s = toggleManaPick(s, 5);
    s = toggleManaPick(s, 3);
    expect(commitMana(s)).toBe(s);
    s = toggleManaPick(s, 8);
    expect(toggleManaPick(s, 1).manaPick).toEqual([5, 3, 8]);
    expect(toggleManaPick(s, 3).manaPick).toEqual([5, 8]);
    s = commitMana(s);
    expect(s).toMatchObject({ phase: 'play', hand: [1, 0, 9], mana: [5, 3, 8], manaPick: [] });
  });

  it('draws, plays to the board, discards and returns to the hand', () => {
    let s = commitMana(toggleManaPick(toggleManaPick(toggleManaPick(newGame(order), 5), 3), 8));
    s = drawCard(s);
    expect(s).toMatchObject({ hand: [1, 0, 9, 2], deck: [4, 6, 7] });
    s = moveCard(s, 0, 'board');
    s = moveCard(s, 9, 'discard');
    s = moveCard(s, 2, 'mana');
    expect(s).toMatchObject({ hand: [1], board: [0], discard: [9], mana: [5, 3, 8, 2] });
    s = moveCard(s, 9, 'hand', 0);
    expect(s.hand).toEqual([9, 1]);
    expect(moveCard(newGame(order), 5, 'board')).toMatchObject({ phase: 'setup', board: [] });
  });
});
