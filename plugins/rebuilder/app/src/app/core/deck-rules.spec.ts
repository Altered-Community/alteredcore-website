import { rarityCountsFromRefs, rarityOf, typeOf } from './deck-rules';

describe('deck card helpers', () => {
  it('reads the rarity from the card, else from its reference', () => {
    expect(rarityOf({ reference: 'ALT_CORE_B_AX_04_R1' })).toBe('RARE');
    expect(rarityOf({ reference: 'ALT_CORE_B_AX_04_U_12' })).toBe('UNIQUE');
    expect(rarityOf({ reference: 'X', rarity: { reference: 'EXALTED' } })).toBe('EXALTED');
    expect(rarityOf({ reference: 'ALT_CORE_B_AX_04_C' })).toBe('COMMON');
    expect(typeOf({ reference: 'X', cardType: { reference: 'spell' } })).toBe('SPELL');
  });

  it('counts copies by rarity, the hero left out', () => {
    expect(
      rarityCountsFromRefs(
        [
          { cardReference: 'ALT_CORE_B_AX_01_C', quantity: 1, cardTypeReference: 'HERO' },
          { cardReference: 'ALT_CORE_B_AX_04_C', quantity: 3 },
          { cardReference: 'ALT_CORE_B_AX_05_R1', quantity: 2 },
          { cardReference: 'ALT_CORE_B_AX_06_U_9', quantity: 1 },
        ],
        'ALT_CORE_B_AX_01_C',
      ),
    ).toEqual({ C: 3, R: 2, U: 1, E: 0 });
  });
});
