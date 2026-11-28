import { DeckPrintModel, guestDeckToWrite } from './deck-print-model';
import type { AltArtChoice } from './ownership-api.service';
import type { Card, Deck, HydratedLine } from './models';

const B = 'ALT_CORE_B_LY_04_C';
const A = 'ALT_CORE_A_LY_04_C';
const P = 'ALT_DUSTER_P_LY_04_C';

const martengaleChoice: AltArtChoice = {
  family: { familyId: 9, faction: 'LY', rarity: 'C' },
  options: {
    options: [
      { reference: B, ownedQuantity: null },
      { reference: A, ownedQuantity: 3 },
      { reference: P, ownedQuantity: 1 },
    ],
    slots: [1, 2, 3].map((slotIndex) => ({ slotIndex, reference: A })),
  },
};

const cardB: Card = { reference: B, name: 'Martengale', cardType: { reference: 'CHARACTER' } };

describe('DeckPrintModel', () => {
  it('pins non-canonical prints on add and removes free copies before pinned copies', () => {
    const model = new DeckPrintModel();
    model.learn(B);
    model.repin(P, 0, 1, 1);
    expect(model.pinsOf({ reference: B })).toEqual([P]);

    // Adding canonical copies does not add pins; removing 1 of 2 total P copies drops only when needed.
    model.repin(B, 0, 2, 3);
    expect(model.pinsOf({ reference: B })).toEqual([P]);
    model.repin(P, 1, 0, 2);
    expect(model.pinsOf({ reference: B })).toEqual([]);
  });

  it('pins explicit prints, updates family quantities, applies preferences and clears pins', () => {
    const model = new DeckPrintModel();
    const lines: HydratedLine[] = [{ card: cardB, quantity: 3 }];
    const members = new Set([B, A, P]);

    const pinRes = model.pinPrints(cardB, lines, martengaleChoice, members, [P]);
    expect(pinRes?.nextLines?.map((l) => [l.card.reference, l.quantity])).toEqual([
      [P, 1],
      [A, 2],
    ]);
    expect(model.pinsOf(cardB)).toEqual([P]);

    const qtyRes = model.setFamilyQuantity(cardB, pinRes!.nextLines!, martengaleChoice, members, 1);
    expect(qtyRes?.nextLines.map((l) => [l.card.reference, l.quantity])).toEqual([[P, 1]]);
    expect(qtyRes?.lastChange).toMatchObject({ card: { reference: A }, quantity: 0, delta: -1 });

    expect(model.clearPins()).toBe(true);
    expect(model.clearPins()).toBe(false);

    const prefRes = model.applyPreferences(qtyRes!.nextLines, null, { [B]: martengaleChoice, [A]: martengaleChoice, [P]: martengaleChoice });
    expect(prefRes.nextLines?.map((l) => [l.card.reference, l.quantity])).toEqual([[A, 1]]);
  });

  it('tracks token prints per token family and writes canonical deckCards + altArtOverrides', () => {
    const model = new DeckPrintModel();
    const tokenFamily = ['ALT_CORE_A_LY_31_C', 'ALT_CORE_B_LY_31_C'];
    model.setTokenPrint(tokenFamily, 'ALT_CORE_B_LY_31_C');
    expect(model.tokenPrintOf(tokenFamily)).toBe('ALT_CORE_B_LY_31_C');

    model.learn(B);
    model.setPinsOf('LY_04_C', [P]);
    const written = model.writeCards([
      { reference: P, quantity: 1 },
      { reference: A, quantity: 2 },
    ]);
    expect(written).toEqual({
      deckCards: [{ cardReference: B, quantity: 3 }],
      altArtOverrides: {
        cards: { [B]: [{ reference: P, quantity: 1 }] },
        tokens: [{ reference: 'ALT_CORE_B_LY_31_C', quantity: 1 }],
      },
    });
  });

  it('converts a guest deck to a private non-draft DeckWrite with hero first and no duplicate hero line', () => {
    const guest: Deck = {
      id: 'guest-1',
      name: 'Moyo',
      description: 'Aggro',
      format: 'standard',
      isPublic: true,
      hero: { reference: 'ALT_CORE_B_YZ_01_C', name: 'Moyo', faction: 'YZ' },
      deckCards: [
        { cardReference: 'ALT_CORE_B_YZ_01_C', quantity: 1 },
        { cardReference: 'ALT_CORE_B_YZ_10_C', quantity: 3 },
      ],
    };
    expect(guestDeckToWrite(guest)).toEqual({
      name: 'Moyo',
      description: 'Aggro',
      format: 'standard',
      isPublic: false,
      isDraft: false,
      deckCards: [
        { cardReference: 'ALT_CORE_B_YZ_01_C', quantity: 1 },
        { cardReference: 'ALT_CORE_B_YZ_10_C', quantity: 3 },
      ],
    });
  });
});
