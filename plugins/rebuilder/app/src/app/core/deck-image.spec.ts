import { environment } from '../../environments/environment';
import { deckImageFileName, deckImageUrl } from './deck-image';

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

describe('deckImageUrl', () => {
  const saved = { ...environment };
  afterEach(() => Object.assign(environment, saved));

  it('is the card plugin endpoint of the site', () => {
    Object.assign(environment, { pluginApiUrl: '/papi/rebuilder/', siteUrl: '/site/' });
    expect(deckImageUrl('abc')).toBe('/site/papi/core-altered-cards/deck-image?id=abc&lang=fr');
  });

  it('is null outside the site', () => {
    Object.assign(environment, { pluginApiUrl: '' });
    expect(deckImageUrl('abc')).toBeNull();
  });
});
