import { CARD_BACK, heroArtSources } from './card-art';

describe('heroArtSources', () => {
  it('tries the frameless art, the art with the logo, the card, then the card back', () => {
    expect(heroArtSources('ALT_FUGUE_B_AX_130_C', 'fr')).toEqual([
      'https://cdn.alteredcore.org/illustrations/FUGUE/ALT_FUGUE_B_AX_130_C_FRAMELESS_T1.webp',
      'https://cdn.alteredcore.org/cards/assets/FUGUE/ALT_FUGUE_B_AX_130_C.webp',
      'https://cdn.alteredcore.org/cards/fr/FUGUE/ALT_FUGUE_B_AX_130_C.webp',
      CARD_BACK,
    ]);
  });
});
