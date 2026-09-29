import { parseEquinoxCsv, sameDeck, splitCsvLine, withHero } from './equinox-csv';

const HEADER = 'id;name;format;hero;col;ref;col;qty';

describe('parseEquinoxCsv', () => {
  it('groups rows by deck id and sums duplicate cards', () => {
    const decks = parseEquinoxCsv(
      [HEADER, 'D1;My Deck;Standard;alt_core_b_ax_01_c;x;ALT_CARD_A;y;2', 'D1;My Deck;standard;ALT_CORE_B_AX_01_C;x;ALT_CARD_A;y;1', 'D1;My Deck;standard;ALT_CORE_B_AX_01_C;x;alt_card_b;y;3', 'D2;Other;;ALT_HERO;x;ALT_CARD_C;y;1'].join('\n'),
    );
    expect(decks).toEqual([
      {
        name: 'My Deck',
        format: 'standard',
        hero: 'ALT_CORE_B_AX_01_C',
        cards: [
          { cardReference: 'ALT_CARD_A', quantity: 3 },
          { cardReference: 'ALT_CARD_B', quantity: 3 },
        ],
      },
      { name: 'Other', format: 'standard', hero: 'ALT_HERO', cards: [{ cardReference: 'ALT_CARD_C', quantity: 1 }] },
    ]);
  });

  it('reads a BOM, CRLF and a quoted name with a semicolon', () => {
    const [deck] = parseEquinoxCsv(`\uFEFF${HEADER}\r\nD9;"Subhash; & ""Marmo""";nuc;ALT_HERO;x;ALT_CARD_C;y;1\r\n`);
    expect(deck.name).toBe('Subhash; & "Marmo"');
    expect(deck.format).toBe('nuc');
  });

  it('skips short rows, rows without id, invalid references and quantities', () => {
    const decks = parseEquinoxCsv([HEADER, 'D1;A;standard;ALT_HERO;x;ALT_CARD_A', ';A;standard;ALT_HERO;x;ALT_CARD_A;y;1', 'D1;A;standard;ALT_HERO;x;NOT_A_CARD;y;1', 'D1;A;standard;ALT_HERO;x;ALT_CARD_B;y;0', 'D1;A;standard;ALT_HERO;x;ALT_CARD_C;y;100'].join('\n'));
    expect(decks).toEqual([{ name: 'A', format: 'standard', hero: 'ALT_HERO', cards: [] }]);
  });

  it('splits on semicolons outside quotes only', () => {
    expect(splitCsvLine('a;"b;c";;d')).toEqual(['a', 'b;c', '', 'd']);
  });
});

describe('withHero', () => {
  it('puts the hero first, once', () => {
    const cards = [{ cardReference: 'ALT_CARD_A', quantity: 3 }];
    expect(withHero('ALT_HERO', cards)).toEqual([{ cardReference: 'ALT_HERO', quantity: 1 }, ...cards]);
    expect(withHero('ALT_CARD_A', cards)).toBe(cards);
    expect(withHero('', cards)).toBe(cards);
  });
});

describe('sameDeck', () => {
  const deck = { name: 'My Deck', cards: [{ cardReference: 'ALT_B', quantity: 1 }, { cardReference: 'ALT_A', quantity: 2 }] };

  it('ignores name case and spaces, card order and split lines', () => {
    expect(sameDeck(deck, { name: ' my deck ', cards: [{ cardReference: 'alt_a', quantity: 1 }, { cardReference: 'ALT_B', quantity: 1 }, { cardReference: 'ALT_A', quantity: 1 }] })).toBe(true);
  });

  it('differs on a quantity or a name', () => {
    expect(sameDeck(deck, { name: 'My Deck', cards: [{ cardReference: 'ALT_A', quantity: 3 }, { cardReference: 'ALT_B', quantity: 1 }] })).toBe(false);
    expect(sameDeck(deck, { name: 'My Deck 2', cards: deck.cards })).toBe(false);
  });
});
