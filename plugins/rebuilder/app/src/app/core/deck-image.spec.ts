import { environment } from '../../environments/environment';
import { deckImageFileName, deckImageSource } from './deck-image';
import type { Deck } from './models';

describe('deckImageFileName', () => {
  it('keeps letters and digits of the name, in lower case, without accents', () => {
    expect(deckImageFileName('Fen & Crowbar · Frontier')).toBe('fen-crowbar-frontier.jpg');
    expect(deckImageFileName('Éclair d’été — v2')).toBe('eclair-d-ete-v2.jpg');
  });

  it('falls back to « deck » for a name without letters', () => {
    expect(deckImageFileName('')).toBe('deck.jpg');
    expect(deckImageFileName('· — ·')).toBe('deck.jpg');
  });

  it('keeps 80 characters at most', () => {
    expect(deckImageFileName('a '.repeat(100)).length).toBeLessThanOrEqual(84);
  });
});

describe('deckImageSource', () => {
  const saved = { ...environment };
  afterEach(() => Object.assign(environment, saved));

  it('is the card plugin endpoint of the site, by the deck id', () => {
    Object.assign(environment, { pluginApiUrl: '/papi/rebuilder/', siteUrl: '/site/' });
    expect(deckImageSource('abc')).toEqual({ url: '/site/papi/core-altered-cards/deck-image?id=abc&lang=fr' });
  });

  it('sends a guest deck its hero and cards, without its id', () => {
    Object.assign(environment, { pluginApiUrl: '/papi/rebuilder/', siteUrl: '/site/' });
    const guest: Deck = {
      id: 'guest-1',
      name: 'Mon deck',
      format: 'standard',
      guest: true,
      hero: { reference: 'ALT_CORE_B_AX_01_C', name: 'Sierra', faction: 'AX' },
      deckCards: [{ cardReference: 'ALT_CORE_B_AX_04_C', quantity: 3 }],
    };
    const source = deckImageSource('guest-1', guest);
    expect(source?.url).toBe('/site/papi/core-altered-cards/deck-image?lang=fr');
    expect(JSON.parse(source?.body ?? '')).toEqual({
      name: 'Mon deck',
      format: 'standard',
      hero: { reference: 'ALT_CORE_B_AX_01_C', name: 'Sierra', faction: 'AX' },
      cards: [{ cardReference: 'ALT_CORE_B_AX_04_C', quantity: 3 }],
    });
  });

  it('is null outside the site', () => {
    Object.assign(environment, { pluginApiUrl: '' });
    expect(deckImageSource('abc')).toBeNull();
  });
});
