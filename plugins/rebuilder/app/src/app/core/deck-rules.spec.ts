import { DECK_SIZE, computeDeckStatus, maxCopiesFor, rarityCountsFromRefs } from './deck-rules';
import type { Card, HydratedLine } from './models';
import { rarityFromReference } from './models';

const card = (partial: Partial<Card> & { reference: string }): Card => ({ ...partial });
const line = (reference: string, quantity: number, type = 'CHARACTER', name?: string): HydratedLine => ({
  quantity,
  card: card({ reference, name: name ?? reference, cardType: { reference: type } }),
});
const commons = (n: number, qty = 3) => Array.from({ length: n }, (_, i) => line(`ALT_CORE_B_AX_${10 + i}_C`, qty));

describe('computeDeckStatus', () => {
  it('ignores the hero when counting size', () => {
    const lines: HydratedLine[] = [line('ALT_CORE_B_AX_03_C', 1, 'HERO'), ...commons(13)];
    const status = computeDeckStatus(lines);
    expect(status.total).toBe(DECK_SIZE);
    expect(status.characters).toBe(DECK_SIZE);
    expect(status.common).toBe(DECK_SIZE);
    expect(status.legal).toBe(true);
  });

  it('flags over-rare and short decks', () => {
    const status = computeDeckStatus([line('ALT_CORE_B_AX_20_R', 16, 'SPELL')]);
    expect(status.rare).toBe(16);
    expect(status.legal).toBe(false);
    expect(status.issues.some((i) => i.startsWith('rare'))).toBe(true);
    expect(status.issues.some((i) => i.startsWith('size'))).toBe(true);
  });

  it('accepts 39–59 cards in standard and 59–79 in singleton', () => {
    expect(computeDeckStatus(commons(19), 'standard').legal).toBe(true); // 57
    expect(computeDeckStatus(commons(20), 'standard').legal).toBe(false); // 60
    expect(computeDeckStatus(commons(59, 1), 'singleton').legal).toBe(true);
    expect(computeDeckStatus(commons(13), 'singleton').issues.some((i) => i.startsWith('singleton'))).toBe(true);
  });

  it('limits copies per name across references (maxCopiesPerName = 3)', () => {
    const lines = [...commons(12), line('ALT_CORE_B_AX_90_C', 2, 'CHARACTER', 'Same'), line('ALT_CORE_B_AX_90_R1', 2, 'CHARACTER', 'Same')];
    const status = computeDeckStatus(lines, 'standard');
    expect(status.issues.some((i) => i.startsWith('copies same'))).toBe(true);
  });

  it('forbids uniques in NUC formats and allows anything in sandbox', () => {
    const lines = [...commons(12), line('ALT_EOLE_B_AX_109_U_374', 1)];
    expect(computeDeckStatus(lines, 'nuc').issues.some((i) => i.startsWith('unique'))).toBe(true);
    expect(computeDeckStatus([line('ALT_CORE_B_AX_20_R', 20, 'SPELL')], 'sandbox').legal).toBe(true);
  });
});

describe('maxCopiesFor', () => {
  it('returns 1 for heroes, uniques and singleton, 3 otherwise', () => {
    expect(maxCopiesFor(card({ reference: 'ALT_CORE_B_AX_01_C', cardType: { reference: 'HERO' } }))).toBe(1);
    expect(maxCopiesFor(card({ reference: 'ALT_EOLE_B_AX_109_U_374' }))).toBe(1);
    expect(maxCopiesFor(card({ reference: 'ALT_CORE_B_AX_10_C' }), 'singleton')).toBe(1);
    expect(maxCopiesFor(card({ reference: 'ALT_CORE_B_AX_10_C' }))).toBe(3);
  });
});

describe('rarity from references', () => {
  it('reads out-of-faction rares (_R1/_R2) and uniques', () => {
    expect(rarityFromReference('ALT_EOLE_B_OR_118_R2')).toBe('RARE');
    expect(rarityFromReference('ALT_CORE_B_AX_04_R1')).toBe('RARE');
    expect(rarityFromReference('ALT_EOLE_B_OR_109_U_374')).toBe('UNIQUE');
    expect(rarityFromReference('ALT_CORE_B_AX_04_C')).toBe('COMMON');
  });

  it('counts C/R/U/E and skips the hero', () => {
    const counts = rarityCountsFromRefs(
      [
        { cardReference: 'ALT_CORE_B_AX_01_C', quantity: 1, cardTypeReference: 'HERO' },
        { cardReference: 'ALT_CORE_B_AX_04_C', quantity: 3 },
        { cardReference: 'ALT_CORE_B_AX_05_R1', quantity: 2 },
        { cardReference: 'ALT_EOLE_B_AX_109_U_1', quantity: 1 },
      ],
      'ALT_CORE_B_AX_01_C',
    );
    expect(counts).toEqual({ C: 3, R: 2, U: 1, E: 0 });
  });
});
