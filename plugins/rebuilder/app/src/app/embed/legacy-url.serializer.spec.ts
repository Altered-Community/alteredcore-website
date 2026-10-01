import { LegacyUrlSerializer, toRouteUrl, toSiteUrl } from './legacy-url.serializer';

const ID = '0f5e1f5e-1c2b-4a7d-9d1e-1234567890ab';

describe('legacy URLs of the decks pages', () => {
  it.each([
    [`/deck?id=${ID}`, `/decks/${ID}`],
    [`/deck?id=${ID}&tab=description`, `/decks/${ID}/description`],
    [`/deck?id=${ID}&tab=unknown`, `/decks/${ID}`],
    [`/deck?id=${ID}&lang=fr`, `/decks/${ID}?lang=fr`],
    ['/deck', '/decks'],
    [`/deckbuilder?id=${ID}`, `/decks/${ID}/edit`],
    [`/deckbuilder?id=${ID}&view=apercu&theme=dark`, `/decks/${ID}/edit/apercu?theme=dark`],
    ['/deckbuilder', '/decks/new'],
    ['/decks?tab=community', '/decks?tab=community'],
    [`/decks/${ID}/edit`, `/decks/${ID}/edit`],
    [`/rebuilder/decks/${ID}/edit`, `/decks/${ID}/edit`],
    [`/rebuilder?id=${ID}`, `/decks/${ID}/edit`],
    [`/rebuilder/deck?id=${ID}`, `/decks/${ID}`],
    ['/rebuilder', '/'],
  ])('reads %s as the route %s', (url, route) => {
    expect(toRouteUrl(url)).toBe(route);
  });

  it.each([
    [`/decks/${ID}`, `/deck?id=${ID}`],
    [`/decks/${ID}/cartes`, `/deck?id=${ID}`],
    [`/decks/${ID}/main?x=1#top`, `/deck?id=${ID}&tab=main&x=1#top`],
    [`/decks/${ID}/edit`, `/deckbuilder?id=${ID}`],
    [`/decks/${ID}/edit/deck`, `/deckbuilder?id=${ID}&view=deck`],
    ['/decks/new', '/deckbuilder'],
    ['/decks?tab=community', '/decks?tab=community'],
    ['/login', '/login'],
  ])('writes the route %s as %s', (route, url) => {
    expect(toSiteUrl(route)).toBe(url);
  });

  it('round-trips through the router serializer', () => {
    const serializer = new LegacyUrlSerializer();
    for (const url of [`/deck?id=${ID}&tab=deck`, `/deckbuilder?id=${ID}&view=main`, '/deckbuilder', '/decks?tab=community']) {
      expect(serializer.serialize(serializer.parse(url))).toBe(url);
    }
  });
});
