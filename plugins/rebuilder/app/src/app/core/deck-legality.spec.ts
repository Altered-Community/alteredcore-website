import {
  legalityCheckDetail,
  legalityCheckLabel,
  legalityFromApi,
  legalityFromStatus,
  legalityRuleLabel,
  lineViolationLabel,
  withServerVerdict,
} from './deck-legality';
import { computeDeckStatus } from './deck-rules';
import type { HydratedLine } from './models';

describe('deck legality', () => {
  it('reads the decks API verdict, failed checks and format errors', () => {
    expect(legalityFromApi({ legal: true, legalityDetail: { hero: false } })).toEqual({ state: 'legal', rules: [], errors: [] });
    expect(
      legalityFromApi({ legal: false, formatErrors: ['ALT_X is banned'], legalityDetail: { global: false, hero: true, deckSize: false, bannedCards: false } }),
    ).toEqual({ state: 'illegal', rules: ['deckSize', 'bannedCards'], errors: ['ALT_X is banned'] });
  });

  it('shows no verdict for a draft the API has not checked yet, nor without `legal`', () => {
    expect(legalityFromApi({ legal: false, formatErrors: [], legalityDetail: { global: false } })?.state).toBe('unknown');
    expect(legalityFromApi({})).toBeNull();
  });

  it('falls back on the editor rules, hero included', () => {
    const lines: HydratedLine[] = [{ quantity: 4, card: { reference: 'ALT_CORE_B_YZ_10_C', name: 'Zou', cardType: { reference: 'SPELL' } } }];
    const status = computeDeckStatus(lines);
    const legality = legalityFromStatus(status, false);
    expect(legality).toMatchObject({ state: 'illegal', rules: ['hero', 'deckSize', 'copies'], errors: [] });
    expect(legality.checks?.map((c) => [c.rule, c.ok])).toEqual([
      ['hero', false],
      ['sets', true],
      ['deckSize', false],
      ['rareQuantity', true],
      ['exaltedQuantity', true],
      ['uniqueQuantity', true],
      ['uniqueCopies', true],
      ['copies', false],
      ['faction', true],
      ['bannedCards', true],
      ['suspendedCards', true],
    ]);
    expect(legalityRuleLabel('copies')).toBe('Trop de copies d’un même nom');
    expect(legalityRuleLabel('newRule')).toBe('newRule');
  });

  it('describes each check like the site’s rules modal', () => {
    const check = (current: number | null, max: number | null, min: number | null = null) => ({ rule: 'deckSize' as const, ok: true, current, min, max });
    expect(legalityCheckDetail(check(40, 59, 39))).toBe('40 / 39–59');
    expect(legalityCheckDetail(check(2, 3))).toBe('2 / 3');
    expect(legalityCheckDetail(check(null, 3))).toBe('≤ 3');
    expect(legalityCheckDetail(check(null, null))).toBe('');
    expect(legalityCheckLabel('faction')).toBe('Toutes les cartes de la faction du héros');
    expect(lineViolationLabel('faction')).toBe('Hors de la faction du héros');
    expect(lineViolationLabel('copies')).toBe('Trop de copies d’un même nom');
  });

  describe('withServerVerdict', () => {
    const lines: HydratedLine[] = Array.from({ length: 13 }, (_, i) => ({
      quantity: 3,
      card: { reference: `ALT_CORE_B_YZ_${10 + i}_C`, name: `C${i}`, cardType: { reference: 'SPELL' }, faction: { code: 'YZ', name: 'Yzmir' } },
    }));
    const local = legalityFromStatus(computeDeckStatus(lines, 'standard', { reference: 'ALT_CORE_B_YZ_01_C', faction: 'YZ' }), true);

    it('changes nothing when the server verdict is the editor’s own', () => {
      expect(local.state).toBe('legal');
      expect(withServerVerdict(local, local)).toEqual(local);
    });

    it('fails the rules the server failed, even those the editor cannot check', () => {
      const merged = withServerVerdict(local, { state: 'illegal', rules: ['bannedCards', 'frontierUniques'], errors: ['ALT_X is banned'] });
      expect(merged.state).toBe('illegal');
      expect(merged.rules).toEqual(['bannedCards', 'frontierUniques']);
      expect(merged.errors).toEqual(['ALT_X is banned']);
      expect(merged.checks?.find((c) => c.rule === 'bannedCards')?.ok).toBe(false);
      expect(merged.checks?.at(-1)).toMatchObject({ rule: 'frontierUniques', ok: false });
    });

    it('does not double a server `copies` the editor already explains as a Unique copies rule', () => {
      const withUnique = [...lines.slice(0, 12), { quantity: 2, card: { reference: 'ALT_CORE_B_YZ_30_U_1', name: 'U', faction: { code: 'YZ', name: 'Yzmir' } } }];
      const own = legalityFromStatus(computeDeckStatus(withUnique, 'standard', { reference: 'ALT_CORE_B_YZ_01_C' }), true);
      const merged = withServerVerdict(own, { state: 'illegal', rules: ['copies'], errors: [] });
      expect(merged.rules).toEqual(['deckSize', 'uniqueCopies']);
    });

    it('ignores a draft the server has not checked', () => {
      expect(withServerVerdict(local, { state: 'unknown', rules: [], errors: [] }).state).toBe('legal');
    });
  });
});
