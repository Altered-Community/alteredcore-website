import { illegalLabel, legalityFromApi, legalityRuleLabel, lineIssuesOf, problemCount } from './deck-legality';

describe('deck legality', () => {
  it('reads the decks API verdict, its rules and its translated problems', () => {
    expect(legalityFromApi({ legal: true, legalityDetail: { hero: true, global: true } })).toEqual({
      state: 'legal',
      rules: [],
      errors: [],
      issues: [],
      checks: [{ rule: 'hero', ok: true }],
    });
    const legality = legalityFromApi({
      legal: false,
      formatErrors: ['old message'],
      errors: [{ code: 'card.banned', reference: 'ALT_CORE_B_BR_06_C', message: 'La carte « X » est bannie.' }],
      legalityDetail: { global: false, hero: true, deckSize: false, bannedCards: false },
    });
    expect(legality).toMatchObject({ state: 'illegal', rules: ['deckSize', 'bannedCards'], errors: ['La carte « X » est bannie.'] });
    expect(legality?.checks).toEqual([
      { rule: 'hero', ok: true },
      { rule: 'deckSize', ok: false },
      { rule: 'bannedCards', ok: false },
    ]);
    expect(problemCount(legality!)).toBe(1);
  });

  it('falls back on `formatErrors` with the former decks API (no `errors`)', () => {
    expect(legalityFromApi({ legal: false, formatErrors: ['ALT_X is banned'], legalityDetail: { bannedCards: false } })).toMatchObject({
      state: 'illegal',
      errors: ['ALT_X is banned'],
      issues: [],
    });
  });

  it('shows no verdict for a draft the API has not checked, nor without `legal`', () => {
    expect(legalityFromApi({ legal: false, errors: [], formatErrors: null, legalityDetail: null })?.state).toBe('unknown');
    expect(legalityFromApi({})).toBeNull();
  });

  it('puts a card’s problem on each of its prints (same family and rarity), not on its other rarities', () => {
    const legality = legalityFromApi({ legal: false, errors: [{ code: 'card.suspended', reference: 'ALT_CORE_B_OR_27_R1', message: 'suspendue' }] })!;
    const issues = lineIssuesOf(legality, ['ALT_CORE_A_OR_27_R1', 'ALT_CORE_B_OR_27_R1', 'ALT_CORE_B_OR_27_R2']);
    expect([...issues.keys()]).toEqual(['ALT_CORE_A_OR_27_R1', 'ALT_CORE_B_OR_27_R1']);
  });

  it('labels the rules and the « Non légal » badge', () => {
    expect(legalityRuleLabel('deckSize')).toBe('Nombre de cartes invalide');
    expect(legalityRuleLabel('mystery')).toBe('mystery');
    expect(illegalLabel(0)).toBe('Non légal');
    expect(illegalLabel(2)).toBe('Non légal · 2 problèmes');
  });
});
