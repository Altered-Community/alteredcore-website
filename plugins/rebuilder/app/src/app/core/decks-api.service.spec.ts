import { decksApiBaseUrl } from './decks-api.service';

describe('decksApiBaseUrl', () => {
  it('proxies decks through nginx on the public site', () => {
    expect(decksApiBaseUrl('deckbuilder.yutsa.fr')).toBe('/decks-api');
  });

  it('keeps the upstream URL for local and Capacitor origins', () => {
    expect(decksApiBaseUrl('localhost')).toBe('https://decks.alteredcore.org');
    expect(decksApiBaseUrl('')).toBe('https://decks.alteredcore.org');
  });

  it('proxies decks on a trapdoor preview (ng serve exposes /decks-api)', () => {
    expect(decksApiBaseUrl('rebuilder-decks-8ef8.trapdoor.sh')).toBe('/decks-api');
  });
});
