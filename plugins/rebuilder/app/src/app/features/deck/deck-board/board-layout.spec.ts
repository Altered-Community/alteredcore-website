import type { Card, HydratedLine } from '../../../core/models';
import { boardRows, deckBoard } from './board-layout';

const line = (reference: string, type: string, mainCost: number, quantity = 1): HydratedLine => ({
  card: { reference, name: reference, mainCost, cardType: { reference: type } } as unknown as Card,
  quantity,
});

describe('boardRows', () => {
  it('takes the smallest row count that fits the columns', () => {
    // 17 cards on one row: 17 columns > 12; on two rows: 2 + 4 + 1 + 2 = 9.
    expect(boardRows([4, 8, 2, 3], 12)).toBe(2);
    // A singleton deck of 45 cards.
    expect(boardRows([15, 18, 6, 6], 12)).toBe(5);
    expect(boardRows([3, 2], 12)).toBe(1);
  });

  it('stops at the largest group when the groups alone exceed the columns', () => {
    expect(boardRows([1, 1, 1], 2)).toBe(1);
  });
});

describe('deckBoard', () => {
  it('puts the Uniques apart, sorts by cost and gives each group its columns', () => {
    const groups = deckBoard([
      line('ALT_CORE_B_YZ_08_C', 'CHARACTER', 3, 3),
      line('ALT_CORE_B_YZ_04_C', 'CHARACTER', 1, 2),
      line('ALT_CORE_B_YZ_08_U_123', 'CHARACTER', 2),
      line('ALT_CORE_B_YZ_20_C', 'SPELL', 4, 0),
    ]);
    expect(groups.map((g) => g.id)).toEqual(['characters', 'spells', 'uniques']);
    expect(groups[0].lines.map((l) => l.card.reference)).toEqual(['ALT_CORE_B_YZ_04_C', 'ALT_CORE_B_YZ_08_C']);
    expect(groups[0].count).toBe(5);
    expect(groups[1].count).toBe(0);
    expect(groups.map((g) => g.columns)).toEqual([2, 1, 1]);
  });
});
