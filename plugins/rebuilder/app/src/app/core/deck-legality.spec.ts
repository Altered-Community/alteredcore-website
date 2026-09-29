import { legalityFromApi, legalityFromStatus, legalityRuleLabel } from './deck-legality';
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
    expect(legalityFromStatus(status, false)).toEqual({ state: 'illegal', rules: ['hero', 'copies', 'deckSize'], errors: [] });
    expect(legalityRuleLabel('copies')).toBe('Trop de copies d’un même nom');
    expect(legalityRuleLabel('newRule')).toBe('newRule');
  });
});
