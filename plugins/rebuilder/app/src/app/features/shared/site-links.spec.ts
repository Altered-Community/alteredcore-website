import { siteLinks } from './site-links';

describe('siteLinks', () => {
  it('lists only the sections the app implements', () => {
    expect(siteLinks().map((l) => [l.label, l.route])).toEqual([
      ['Cartes', '/cartes'],
      ['Decks', '/decks'],
    ]);
  });
});
