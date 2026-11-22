import { canonicalFromAnswer, deckWriteCards, familyOf, guessCanonical, printKey, readDeckPrints, runs } from './deck-prints';

describe('deck prints', () => {
  it('reads a card’s family and gameplay key from its reference', () => {
    expect(familyOf('ALT_CORE_A_AX_4_R2')).toBe('AX_04');
    expect(printKey('ALT_DUSTER_P_AX_04_C')).toBe('AX_04_C');
    expect(printKey('ALT_CORE_B_AX_04_U_12')).toBe('ALT_CORE_B_AX_04_U_12');
  });

  it('guesses the canonical reference only when the reference tells it', () => {
    expect(guessCanonical('ALT_CORE_B_AX_04_C')).toBe('ALT_CORE_B_AX_04_C');
    expect(guessCanonical('ALT_COREKS_B_AX_04_C')).toBe('ALT_CORE_B_AX_04_C');
    expect(guessCanonical('ALT_CORE_A_AX_04_C')).toBeNull();
    expect(guessCanonical('ALT_CORE_B_AX_04_U_12')).toBe('ALT_CORE_B_AX_04_U_12');
  });

  it('reads the decks API’s canonical cards and overrides', () => {
    const prints = readDeckPrints({
      id: 'd',
      name: 'D',
      canonicalCards: [{ cardReference: 'ALT_CORE_B_AX_04_C', quantity: 3 }],
      altArtOverrides: { cards: { ALT_CORE_B_AX_04_C: [{ reference: 'ALT_CORE_A_AX_04_C', quantity: 5 }] }, tokens: [{ reference: 'T', quantity: 1 }] },
    });
    expect(prints.pins.get('AX_04_C')).toEqual(['ALT_CORE_A_AX_04_C', 'ALT_CORE_A_AX_04_C', 'ALT_CORE_A_AX_04_C']);
    expect(prints.canonical.get('AX_04_C')).toBe('ALT_CORE_B_AX_04_C');
    expect(prints.tokens).toEqual([{ reference: 'T', quantity: 1 }]);
  });

  it('reads a pin on the canonical print as a real choice (the base art in this deck), a canonical line alone as none', () => {
    const prints = readDeckPrints({
      id: 'd',
      name: 'D',
      canonicalCards: [
        { cardReference: 'ALT_CORE_B_AX_04_C', quantity: 3 },
        { cardReference: 'ALT_CORE_B_AX_05_C', quantity: 1 },
      ],
      altArtOverrides: { cards: { ALT_CORE_B_AX_04_C: [{ reference: 'ALT_CORE_B_AX_04_C', quantity: 2 }] } },
    });
    expect(prints.pins.get('AX_04_C')).toEqual(['ALT_CORE_B_AX_04_C', 'ALT_CORE_B_AX_04_C']);
    expect(prints.pins.has('AX_05_C')).toBe(false);
  });

  it('pins the alt arts and promos of a deck without canonical cards (former API, guest deck)', () => {
    const prints = readDeckPrints({
      id: 'd',
      name: 'D',
      deckCards: [
        { cardReference: 'ALT_CORE_B_AX_04_C', quantity: 1 },
        { cardReference: 'ALT_DUSTER_P_AX_04_C', quantity: 2 },
      ],
    });
    expect(prints.pins.get('AX_04_C')).toEqual(['ALT_DUSTER_P_AX_04_C', 'ALT_DUSTER_P_AX_04_C']);
    expect(prints.canonical.get('AX_04_C')).toBe('ALT_CORE_B_AX_04_C');
  });

  it('writes one canonical reference per card and the pins as overrides, capped to the copies', () => {
    const body = deckWriteCards(
      [
        { reference: 'ALT_CORE_B_AX_01_C', quantity: 1 },
        { reference: 'ALT_CORE_A_AX_04_C', quantity: 2 },
        { reference: 'ALT_DUSTER_P_AX_04_C', quantity: 1 },
        { reference: 'ALT_CORE_B_AX_05_R1', quantity: 2 },
      ],
      new Map([['AX_04_C', ['ALT_DUSTER_P_AX_04_C', 'ALT_CORE_B_AX_04_C', 'ALT_CORE_A_AX_04_C', 'ALT_CORE_A_AX_04_C', 'X']]]),
      new Map([['AX_04_C', 'ALT_CORE_B_AX_04_C']]),
      [{ reference: 'T', quantity: 1 }],
    );
    expect(body.deckCards).toEqual([
      { cardReference: 'ALT_CORE_B_AX_01_C', quantity: 1 },
      { cardReference: 'ALT_CORE_B_AX_04_C', quantity: 3 },
      { cardReference: 'ALT_CORE_B_AX_05_R1', quantity: 2 },
    ]);
    expect(body.altArtOverrides).toEqual({
      cards: {
        ALT_CORE_B_AX_04_C: [
          { reference: 'ALT_DUSTER_P_AX_04_C', quantity: 1 },
          { reference: 'ALT_CORE_B_AX_04_C', quantity: 1 },
          { reference: 'ALT_CORE_A_AX_04_C', quantity: 1 },
        ],
      },
      tokens: [{ reference: 'T', quantity: 1 }],
    });
  });

  it('sends a card by one of its prints when its canonical reference is unknown', () => {
    expect(deckWriteCards([{ reference: 'ALT_WCS25_P_AX_04_C', quantity: 1 }], new Map(), new Map()).deckCards).toEqual([
      { cardReference: 'ALT_WCS25_P_AX_04_C', quantity: 1 },
    ]);
  });

  it('learns canonical references from an answer, and groups runs', () => {
    expect([...canonicalFromAnswer({ altArtOverrides: { cards: { ALT_CORE_B_AX_04_C: [] } } })]).toEqual([['AX_04_C', 'ALT_CORE_B_AX_04_C']]);
    expect(runs(['A', 'A', 'B', 'A'])).toEqual([
      { reference: 'A', quantity: 2 },
      { reference: 'B', quantity: 1 },
      { reference: 'A', quantity: 1 },
    ]);
  });
});
