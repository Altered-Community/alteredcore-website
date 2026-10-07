import { pageOf } from './page-of';

describe('pageOf', () => {
  it('tells the pages apart', () => {
    const pages = ['/decks', '/deckbuilder', '/deck?id=a', '/deck?id=b', '/deckbuilder?id=a'].map(pageOf);
    expect(new Set(pages).size).toBe(pages.length);
  });

  it('keeps a deck’s tabs, its editor’s views and the list’s query on one page', () => {
    expect(pageOf('/deck?id=a&tab=description')).toBe(pageOf('/deck?id=a'));
    expect(pageOf('/deckbuilder?id=a&view=apercu')).toBe(pageOf('/deckbuilder?id=a'));
    expect(pageOf('/decks?tab=community&q=kelon')).toBe(pageOf('/decks'));
  });
});
