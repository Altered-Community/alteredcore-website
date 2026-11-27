import { compareHeroes, heroArtSources, toHero, type Hero } from './heroes';

describe('toHero', () => {
  it('takes the first standard print of the base game, Kickstarter left out', () => {
    const hero = toHero(
      {
        slug: 'OR-065-C',
        name: { fr: 'Zhen & Zéphyr', en: 'Zhen & Zephyr' },
        faction: { code: 'OR' },
        cards: [
          { reference: 'ALT_EOLE_B_OR_65_C', variation: 'standard' },
          { reference: 'ALT_CYCLONE_P_OR_65_C', variation: 'promo' },
          { reference: 'ALT_CYCLONE_B_OR_65_C', variation: 'standard' },
        ],
      },
      'fr',
    );
    expect(hero).toEqual({ id: 'OR-065-C', name: 'Zhen & Zéphyr', faction: 'OR', reference: 'ALT_CYCLONE_B_OR_65_C', set: 'CYCLONE' });
  });

  it('falls back to the English name, and skips groups without a faction or a print', () => {
    expect(toHero({ slug: 'AX-130-C', name: { en: 'Wayfinder Sierra', es: '' }, faction: { code: 'AX' }, cards: [{ reference: 'ALT_FUGUE_B_AX_130_C', variation: 'standard' }] }, 'fr')?.name).toBe(
      'Wayfinder Sierra',
    );
    expect(toHero({ slug: 'x', faction: {}, cards: [] }, 'fr')).toBeNull();
    expect(toHero({ slug: 'x', faction: { code: 'AX' }, cards: [{ reference: 'ALT_COREKS_B_AX_01_C', variation: 'standard' }] }, 'fr')).toBeNull();
  });
});

describe('heroes', () => {
  const hero = (faction: Hero['faction'], reference: string): Hero => ({ id: reference, name: reference, faction, reference, set: reference.split('_')[1] });

  it('sorts by faction, set, then number', () => {
    const list = [hero('BR', 'ALT_CORE_B_BR_01_C'), hero('AX', 'ALT_FUGUE_B_AX_130_C'), hero('AX', 'ALT_CORE_B_AX_02_C'), hero('AX', 'ALT_CORE_B_AX_10_C')];
    expect(list.sort(compareHeroes).map((h) => h.reference)).toEqual([
      'ALT_CORE_B_AX_02_C',
      'ALT_CORE_B_AX_10_C',
      'ALT_FUGUE_B_AX_130_C',
      'ALT_CORE_B_BR_01_C',
    ]);
  });

  it('uses the frameless full art of the CDN first', () => {
    expect(heroArtSources({ reference: 'ALT_CORE_B_AX_01_C', set: 'CORE' })[0]).toBe(
      'https://cdn.alteredcore.org/illustrations/CORE/ALT_CORE_B_AX_01_C_FRAMELESS_T1.webp',
    );
  });
});
