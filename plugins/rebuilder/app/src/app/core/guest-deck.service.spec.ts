import { TestBed } from '@angular/core/testing';
import { GUEST_DECKS_KEY, GuestDeckService, SITE_GUEST_DECK_KEY, SITE_GUEST_IMPORT_KEY, fromSiteGuestDeck } from './guest-deck.service';

const SITE_DECK = {
  name: 'Deck du site',
  format: 'NUC',
  hero: { cardReference: 'ALT_CORE_B_YZ_01_C', name: { en: 'Moyo & Silk', fr: 'Moyo & Silk' }, factionCode: 'YZ' },
  cards: { ALT_CORE_B_YZ_10_C: { qty: 3, name: 'Zou !', type: 'SPELL', factionCode: 'YZ', mainCost: 2, recallCost: 1 } },
};

describe('GuestDeckService · the site builder guest deck', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('converts the site format (cards by reference, qty)', () => {
    expect(fromSiteGuestDeck(SITE_DECK, 'fr')).toMatchObject({
      name: 'Deck du site',
      format: 'nuc',
      hero: { reference: 'ALT_CORE_B_YZ_01_C', name: 'Moyo & Silk', faction: 'YZ' },
      deckCards: [{ cardReference: 'ALT_CORE_B_YZ_10_C', quantity: 3, cardTypeReference: 'SPELL', mainCost: 2 }],
    });
    expect(fromSiteGuestDeck({ name: 'vide', cards: {} }, 'fr')).toBeNull();
  });

  it('adds it once to the guest decks, follows its changes, and forgets it once saved on the account', () => {
    localStorage.setItem(SITE_GUEST_DECK_KEY, JSON.stringify(SITE_DECK));
    const guests = TestBed.inject(GuestDeckService);
    expect(guests.decks()).toHaveLength(1);
    const id = guests.decks()[0].id;
    guests.reload();
    expect(guests.decks()).toHaveLength(1);

    localStorage.setItem(SITE_GUEST_DECK_KEY, JSON.stringify({ ...SITE_DECK, name: 'Renommé' }));
    guests.reload();
    expect(guests.decks().map((d) => [d.id, d.name])).toEqual([[id, 'Renommé']]);

    guests.forgetSiteDeck(id);
    expect(localStorage.getItem(SITE_GUEST_DECK_KEY)).toBeNull();
    expect(localStorage.getItem(SITE_GUEST_IMPORT_KEY)).toBeNull();
    expect(JSON.parse(localStorage.getItem(GUEST_DECKS_KEY) ?? '[]')).toHaveLength(1);
  });

  it('does not bring back a deleted copy while the site deck is unchanged', () => {
    localStorage.setItem(SITE_GUEST_DECK_KEY, JSON.stringify(SITE_DECK));
    const guests = TestBed.inject(GuestDeckService);
    guests.delete(guests.decks()[0].id);
    guests.reload();
    expect(guests.decks()).toEqual([]);
  });
});
