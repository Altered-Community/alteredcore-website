import { canonicalOf, looksLikeReference, toSuggestions } from './card-suggestions';
import type { Card } from './models';

const card = (reference: string, name: string, faction = 'AX'): Card => ({ reference, name: { fr: name, en: name }, faction: { code: faction, name: faction } });

describe('looksLikeReference', () => {
  it('tells a full card reference from a name', () => {
    expect(looksLikeReference('ALT_CORE_B_AX_04_R1')).toBe(true);
    expect(looksLikeReference(' alt_bise_b_ly_49_u_123 ')).toBe(true);
    expect(looksLikeReference('ALT_CORE')).toBe(false);
    expect(looksLikeReference('kelon')).toBe(false);
  });
});

describe('canonicalOf', () => {
  it('maps a print to the reference the decks API stores', () => {
    expect(canonicalOf('ALT_CORE_B_AX_04_R1')).toBe('ALT_CORE_B_AX_04_R1');
    expect(canonicalOf('ALT_COREKS_B_AX_04_C')).toBe('ALT_CORE_B_AX_04_C');
    expect(canonicalOf('alt_core_a_ax_04_r1')).toBe('ALT_CORE_B_AX_04_R1');
    expect(canonicalOf('ALT_BISE_B_LY_49_U_123')).toBe('ALT_BISE_B_LY_49_U_123');
  });
});

describe('toSuggestions', () => {
  it('gives one suggestion per card and rarity, on the oldest booster print', () => {
    const list = toSuggestions(
      [
        card('ALT_ALIZE_B_LY_02_C', 'Auraq & Kibble', 'LY'),
        card('ALT_COREKS_B_LY_02_C', 'Auraq & Kibble', 'LY'),
        card('ALT_CORE_B_LY_02_C', 'Auraq & Kibble', 'LY'),
      ],
      'auraq',
      'fr',
    );
    expect(list.map((s) => s.reference)).toEqual(['ALT_CORE_B_LY_02_C']);
    expect(list[0]).toMatchObject({ name: 'Auraq & Kibble', rarity: 'C', faction: 'LY' });
    expect(list[0].image).toContain('ALT_CORE_B_LY_02_C');
  });

  it('lists names starting with the text first, then by name and rarity', () => {
    const list = toSuggestions(
      [
        card('ALT_ALIZE_B_AX_43_C', 'Radiateur Kélonique'),
        card('ALT_CORE_B_AX_04_R2', 'Élémentaire de Kélon'),
        card('ALT_CORE_B_AX_04_C', 'Élémentaire de Kélon'),
        card('ALT_CORE_B_AX_04_R1', 'Élémentaire de Kélon'),
        card('ALT_CORE_B_AX_27_C', 'Kélonique, générateur'),
      ],
      'kélon',
      'fr',
    );
    expect(list.map((s) => s.reference)).toEqual([
      'ALT_CORE_B_AX_27_C',
      'ALT_CORE_B_AX_04_C',
      'ALT_CORE_B_AX_04_R1',
      'ALT_CORE_B_AX_04_R2',
      'ALT_ALIZE_B_AX_43_C',
    ]);
  });

  it('keeps at most `limit` suggestions', () => {
    const cards = Array.from({ length: 20 }, (_, i) => card(`ALT_CORE_B_AX_${10 + i}_C`, `Carte ${10 + i}`));
    expect(toSuggestions(cards, '', 'fr', 5)).toHaveLength(5);
  });
});
