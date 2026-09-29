import { DECK_SIZE, addBlockedReason, computeDeckStatus, heroKey, maxCopiesFor, rarityCountsFromRefs, uniqueLimit } from './deck-rules';
import { formatInfo } from './formats';
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

  it('forbids uniques in NUC formats, flagging each one, and allows anything in sandbox', () => {
    const lines = [...commons(12), line('ALT_EOLE_B_AX_109_U_374', 1)];
    const nuc = computeDeckStatus(lines, 'nuc');
    expect(nuc.issues.some((i) => i.startsWith('unique'))).toBe(true);
    expect(nuc.rules).toContain('uniqueQuantity');
    expect(nuc.violations['ALT_EOLE_B_AX_109_U_374']).toEqual(['uniqueQuantity']);
    expect(computeDeckStatus([line('ALT_CORE_B_AX_20_R', 20, 'SPELL')], 'sandbox').legal).toBe(true);
  });

  describe('same faction (site: validation.js sameFaction)', () => {
    const hero = { reference: 'ALT_CORE_B_AX_01_C', faction: 'AX' };
    const inFaction = (n: number) => commons(n).map((l) => ({ ...l, card: { ...l.card, faction: { code: 'AX', name: 'Axiom' } } }));
    const lyra = { quantity: 3, card: card({ reference: 'ALT_CORE_B_LY_10_C', name: 'Lyra card', faction: { code: 'LY', name: 'Lyra' } }) };

    it('makes the deck illegal and flags each off-faction line against the hero', () => {
      const status = computeDeckStatus([...inFaction(12), lyra], 'standard', hero);
      expect(status.total).toBe(39);
      expect(status.legal).toBe(false);
      expect(status.rules).toEqual(['faction']);
      expect(status.violations).toEqual({ ALT_CORE_B_LY_10_C: ['faction'] });
    });

    it('checks the hero’s faction, so changing the hero leaves the old cards off-faction', () => {
      const status = computeDeckStatus(inFaction(13), 'standard', { reference: 'ALT_CORE_B_LY_01_C' });
      expect(status.rules).toEqual(['faction']);
      expect(Object.keys(status.violations)).toHaveLength(13);
    });

    it('reads the card’s own faction, not its reference (out-of-faction rare, unknown faction)', () => {
      const oof = { quantity: 3, card: card({ reference: 'ALT_CORE_B_LY_10_R2', name: 'OOF', faction: { code: 'AX', name: 'Axiom' } }) };
      const unknown = { quantity: 3, card: card({ reference: 'ALT_CORE_B_LY_11_C', name: 'Unknown' }) };
      expect(computeDeckStatus([...inFaction(11), oof, unknown], 'standard', hero).legal).toBe(true);
    });

    it('does not apply in sandbox', () => {
      expect(computeDeckStatus([...inFaction(12), lyra], 'sandbox', hero).legal).toBe(true);
    });
  });

  describe('Uniques by hero in Singleton (altered.json heroUniqueLimits)', () => {
    const singles = (n: number) => commons(n, 1);
    const uniques = (n: number) => Array.from({ length: n }, (_, i) => line(`ALT_EOLE_B_AX_${120 + i}_U_${i + 1}`, 1, 'CHARACTER', `Unique ${i}`));

    it('allows 5 Uniques with Sierra, 4 with Subhash, 3 with a hero not listed', () => {
      const deck = [...singles(55), ...uniques(5)];
      expect(computeDeckStatus(deck, 'singleton', { reference: 'ALT_CORE_B_AX_01_C' }).legal).toBe(true);
      const subhash = computeDeckStatus(deck, 'singleton', { reference: 'ALT_CORE_B_AX_03_C' });
      expect(subhash.uniqueMax).toBe(4);
      expect(subhash.rules).toEqual(['uniqueQuantity']);
      expect(computeDeckStatus(deck, 'singleton', { reference: 'ALT_CORE_B_AX_02_C' }).uniqueMax).toBe(3);
      expect(computeDeckStatus(deck, 'singleton').uniqueMax).toBe(3);
    });

    it('keys the table on FACTION_NUMBER, whatever the set or print', () => {
      expect(heroKey('ALT_ALIZE_B_YZ_65_C')).toBe('YZ_65');
      expect(uniqueLimit(formatInfo('singleton'), { reference: 'ALT_ALIZE_A_YZ_65_R' })).toBe(5);
      expect(uniqueLimit(formatInfo('standard'), { reference: 'ALT_CORE_B_AX_01_C' })).toBe(3);
      expect(uniqueLimit(formatInfo('singleton_nuc'), { reference: 'ALT_CORE_B_AX_01_C' })).toBe(0);
      expect(uniqueLimit(formatInfo('sandbox'), { reference: 'ALT_CORE_B_AX_01_C' })).toBeNull();
    });
  });

  describe('banned and suspended cards', () => {
    const banned = { quantity: 1, card: card({ reference: 'ALT_CORE_B_AX_05_U_141', isBanned: true }) };
    const suspended = { quantity: 3, card: card({ reference: 'ALT_CORE_B_AX_27_R1', name: 'Susp', isSuspended: true }) };

    it('fails the rule and flags the line, except in sandbox', () => {
      const status = computeDeckStatus([...commons(11), banned, suspended], 'standard');
      expect(status.total).toBe(37);
      expect(status.rules).toEqual(['deckSize', 'bannedCards', 'suspendedCards']);
      expect(status.violations).toEqual({ ALT_CORE_B_AX_05_U_141: ['bannedCards'], ALT_CORE_B_AX_27_R1: ['suspendedCards'] });
      expect(status.checks.find((c) => c.rule === 'bannedCards')).toMatchObject({ ok: false, current: 1 });
      expect(computeDeckStatus([...commons(11), banned, suspended], 'sandbox').legal).toBe(true);
    });
  });

  it('flags every line of a name over the copy limit', () => {
    const lines = [...commons(12), line('ALT_CORE_B_AX_90_C', 2, 'CHARACTER', 'Same'), line('ALT_CORE_B_AX_90_R1', 2, 'CHARACTER', 'Same')];
    const status = computeDeckStatus(lines, 'standard');
    expect(status.violations).toEqual({ ALT_CORE_B_AX_90_C: ['copies'], ALT_CORE_B_AX_90_R1: ['copies'] });
  });

  it('has no per-Unique copy limit in sandbox, as on the site', () => {
    const status = computeDeckStatus([line('ALT_EOLE_B_AX_109_U_374', 4)], 'sandbox');
    expect(status.legal).toBe(true);
    expect(computeDeckStatus([...commons(12), line('ALT_EOLE_B_AX_109_U_374', 2)], 'standard').rules).toEqual(['deckSize', 'uniqueCopies']);
  });
});

describe('maxCopiesFor', () => {
  const unique = card({ reference: 'ALT_EOLE_B_AX_109_U_374' });

  it('returns 1 for heroes, uniques and singleton, 3 otherwise', () => {
    expect(maxCopiesFor(card({ reference: 'ALT_CORE_B_AX_01_C', cardType: { reference: 'HERO' } }))).toBe(1);
    expect(maxCopiesFor(unique)).toBe(1);
    expect(maxCopiesFor(card({ reference: 'ALT_CORE_B_AX_10_C' }), 'singleton')).toBe(1);
    expect(maxCopiesFor(card({ reference: 'ALT_CORE_B_AX_10_C' }))).toBe(3);
  });

  it('blocks Uniques in No Unique formats, with the reason', () => {
    expect(maxCopiesFor(unique, 'nuc')).toBe(0);
    expect(maxCopiesFor(unique, 'singleton_nuc')).toBe(0);
    expect(addBlockedReason(unique, 'nuc')).toBe('Cartes uniques interdites en Standard No Unique');
    expect(addBlockedReason(unique, 'standard')).toBeNull();
    expect(addBlockedReason(card({ reference: 'ALT_CORE_B_AX_10_C' }), 'nuc')).toBeNull();
  });

  it('lets Uniques go past one copy in sandbox, like any card', () => {
    expect(maxCopiesFor(unique, 'sandbox')).toBe(99);
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
