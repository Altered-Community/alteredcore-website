import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService, decodeJwtPayload } from './auth.service';
import { CardsApiService } from './cards-api.service';
import { DeckStore } from './deck-store';
import { GUEST_DECKS_KEY, GuestDeckService } from './guest-deck.service';
import type { Card, Deck } from './models';
import { localizedText } from './models';

const hero = { reference: 'ALT_CORE_B_YZ_01_C', name: 'Moyo & Silk', faction: 'YZ' };
const zou: Card = { reference: 'ALT_CORE_B_YZ_10_C', name: 'Zou !', cardType: { reference: 'SPELL' }, mainCost: 2, recallCost: 4 };
const unique: Card = { reference: 'ALT_EOLE_B_YZ_111_U_379', name: 'Diablotin', cardType: { reference: 'CHARACTER' }, rarity: { reference: 'UNIQUE' } };

/** Lets the resource settle (its response lands in a microtask) and runs the store's effect. */
async function settle(): Promise<void> {
  await TestBed.inject(ApplicationRef).whenStable();
  TestBed.tick();
}

function stored(): Deck[] {
  return JSON.parse(localStorage.getItem(GUEST_DECKS_KEY) ?? '[]') as Deck[];
}

describe('DeckStore (guest mode)', () => {
  let store: DeckStore;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('arb.can_refresh', '0');
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    store = TestBed.inject(DeckStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('creates a guest deck with its hero in localStorage', () => {
    const deck = store.create({ name: 'Moyo Embrasement', hero, format: 'standard', isPublic: false });
    expect(deck.id.startsWith('guest-')).toBe(true);
    expect(store.hero()).toEqual(hero);
    const saved = stored()[0];
    expect(saved.name).toBe('Moyo Embrasement');
    expect(saved.hero).toEqual(hero);
    expect(saved.deckCards?.[0]).toMatchObject({ cardReference: hero.reference, cardTypeReference: 'HERO' });
  });

  it('caps quantities per format and autosaves on flush', () => {
    store.create({ name: 'D', hero, format: 'standard', isPublic: false });
    store.setQuantity(zou, 5);
    expect(store.quantityOf(zou.reference)).toBe(3);
    store.addCard(unique);
    store.addCard(unique);
    expect(store.quantityOf(unique.reference)).toBe(1);
    store.removeCard(zou.reference);
    expect(store.total()).toBe(3);
    store.flush();
    const saved = stored()[0];
    expect(saved.deckCards?.map((l) => [l.cardReference, l.quantity])).toEqual([
      [hero.reference, 1],
      [zou.reference, 2],
      [unique.reference, 1],
    ]);
    expect(saved.legal).toBe(false);
  });

  it('applies settings, renames, duplicates and deletes', () => {
    const deck = store.create({ name: 'D', hero, format: 'standard', isPublic: false });
    store.setQuantity(zou, 2);
    store.updateSettings({ format: 'singleton', isPublic: true });
    store.rename('Nouveau nom');
    expect(store.quantityOf(zou.reference)).toBe(2);
    expect(store.maxFor(zou)).toBe(1);
    store.flush();
    expect(stored()[0]).toMatchObject({ name: 'Nouveau nom', format: 'singleton', isPublic: true });

    const copyId = store.duplicate();
    expect(stored().find((d) => d.id === copyId)?.name).toBe('Nouveau nom (copie)');

    store.load(deck.id);
    let ok = false;
    store.delete().subscribe((r) => (ok = r));
    expect(ok).toBe(true);
    expect(stored().map((d) => d.id)).toEqual([copyId]);
  });

  it('keeps a unique effect added in the session and restores it without the cards API', () => {
    const unique: Card = {
      reference: 'ALT_DUSTER_B_YZ_87_U_3890',
      name: 'Chasseur de Hextag',
      cardType: { reference: 'CHARACTER', name: 'Personnage' },
      faction: { code: 'YZ', name: 'Yzmir' },
      mainCost: 2,
      recallCost: 1,
      mainEffect: { fr: '{H} [] Vous pouvez épuiser une carte ciblée en Réserve.' },
      echoEffect: [],
    };
    const deck = store.create({ name: 'test', hero, format: 'standard', isPublic: false });
    store.addCard(unique);
    expect(localizedText(store.lines()[0].card.mainEffect, 'fr')).toContain('épuiser');
    store.flush();
    expect(stored()[0].deckCards?.find((l) => l.cardReference === unique.reference)?.mainEffect).toEqual(unique.mainEffect);

    store.clear();
    store.load(deck.id);
    TestBed.tick();
    http.expectNone((r) => r.url.includes('/api/cards/batch'));
    expect(localizedText(store.lines()[0].card.mainEffect, 'fr')).toContain('épuiser');
  });

  it('fills the printed effect of a unique already in a loaded deck', async () => {
    const calls: { refs: string[]; locale: string }[] = [];
    TestBed.inject(CardsApiService).batch = (refs, locale = 'en') => {
      calls.push({ refs, locale });
      return of([
        {
          reference: refs[0],
          name: 'Chasseur de Hextag',
          cardType: { reference: 'CHARACTER', name: 'Personnage' },
          cardSubTypes: [{ name: 'Gredin' }],
          mainEffect: '{H} [] Vous pouvez épuiser une carte ciblée en Réserve.  {R} [] Piochez une carte.',
          echoEffect: [],
        },
      ]);
    };
    store.load('01a0d3a0-20df-73b9-92fe-fad9f7d04728');
    TestBed.tick();
    http.expectOne((r) => r.url.endsWith('/api/decks/01a0d3a0-20df-73b9-92fe-fad9f7d04728')).flush({
      id: '01a0d3a0-20df-73b9-92fe-fad9f7d04728',
      name: 'test',
      format: 'standard',
      isPublic: true,
      cards: [
        { cardReference: 'ALT_CORE_B_LY_03_C', quantity: 1, name: 'Fen & Crowbar', factionCode: 'LY', cardTypeReference: 'HERO' },
        {
          cardReference: 'ALT_DUSTER_B_YZ_87_U_3890',
          quantity: 1,
          name: 'Chasseur de Hextag',
          factionCode: 'YZ',
          cardTypeReference: 'CHARACTER',
          mainCost: 2,
          recallCost: 1,
          forestPower: 1,
          mountainPower: 2,
          oceanPower: 0,
        },
      ],
    });
    await settle();
    expect(calls).toEqual([{ refs: ['ALT_DUSTER_B_YZ_87_U_3890'], locale: 'fr' }]);
    expect(localizedText(store.lines()[0].card.mainEffect, 'fr')).toContain('Piochez une carte');
    expect(store.lines()[0].card.mainCost).toBe(2);
    expect(store.lines()[0].card.cardSubTypes?.[0]).toEqual({ name: 'Gredin' });
  });

  it('reports unknown guest decks', () => {
    store.load('guest-missing');
    expect(store.error()).toContain('introuvable');
  });

  it('loads public server decks anonymously and keeps them read-only without a token', async () => {
    store.load('01a0d3a0-20df-73b9-92fe-fad9f7d04728');
    TestBed.tick();
    const req = http.expectOne((r) => r.url.endsWith('/api/decks/01a0d3a0-20df-73b9-92fe-fad9f7d04728'));
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({
      id: '01a0d3a0-20df-73b9-92fe-fad9f7d04728',
      name: 'Public',
      format: 'standard',
      isPublic: true,
      cards: [
        { cardReference: 'ALT_CORE_B_LY_03_C', quantity: 1, name: 'Fen & Crowbar', factionCode: 'LY', cardTypeReference: 'HERO' },
        { cardReference: 'ALT_CORE_B_LY_04_C', quantity: 2, name: 'Martengale', factionCode: 'LY', cardTypeReference: 'CHARACTER', mainCost: 1, recallCost: 1 },
      ],
    });
    await settle();
    expect(store.hero()?.name).toBe('Fen & Crowbar');
    expect(store.total()).toBe(2);
    expect(store.editable()).toBe(false);
    store.setQuantity({ reference: 'ALT_CORE_B_LY_04_C' }, 3);
    expect(store.total()).toBe(2);
  });

  it('shows a login hint for private decks', async () => {
    store.load('private-id');
    TestBed.tick();
    http.expectOne((r) => r.url.endsWith('/api/decks/private-id')).flush({}, { status: 401, statusText: 'Unauthorized' });
    await settle();
    expect(store.error()).toContain('privé');
    expect(store.loading()).toBe(false);
  });

  it('drops the response of a deck the user already left', async () => {
    store.load('deck-a');
    TestBed.tick();
    const first = http.expectOne((r) => r.url.endsWith('/api/decks/deck-a'));
    store.load('deck-b');
    TestBed.tick();
    expect(first.cancelled).toBe(true);
    http.expectOne((r) => r.url.endsWith('/api/decks/deck-b')).flush({ id: 'deck-b', name: 'B', format: 'standard', cards: [] });
    await settle();
    expect(store.deckId()).toBe('deck-b');
    expect(store.name()).toBe('B');
  });

  it('refetches the same deck after an error', async () => {
    store.load('flaky');
    TestBed.tick();
    http.expectOne((r) => r.url.endsWith('/api/decks/flaky')).flush({}, { status: 500, statusText: 'Server Error' });
    await settle();
    expect(store.error()).toContain('Impossible');
    store.load('flaky');
    TestBed.tick();
    http.expectOne((r) => r.url.endsWith('/api/decks/flaky')).flush({ id: 'flaky', name: 'Retour', format: 'standard', cards: [] });
    await settle();
    expect(store.error()).toBeNull();
    expect(store.name()).toBe('Retour');
  });
});

describe('GuestDeckService', () => {
  beforeEach(() => localStorage.clear());

  it('survives corrupted storage and re-reads on reload', () => {
    localStorage.setItem(GUEST_DECKS_KEY, '{broken');
    const svc = TestBed.inject(GuestDeckService);
    expect(svc.decks()).toEqual([]);
    localStorage.setItem(GUEST_DECKS_KEY, JSON.stringify([{ id: 'guest-a', name: 'A' }, { nope: true }]));
    svc.reload();
    expect(svc.decks().map((d) => d.id)).toEqual(['guest-a']);
    expect(GuestDeckService.isGuestId('guest-a')).toBe(true);
    expect(GuestDeckService.isGuestId('01a0')).toBe(false);
  });
});

describe('AuthService', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.setItem('arb.can_refresh', '0');
  });

  const jwt = (payload: object) => `h.${btoa(JSON.stringify(payload)).replace(/=+$/, '')}.s`;

  it('shows the Keycloak pseudo and never preferred_username', () => {
    const auth = TestBed.inject(AuthService);
    auth.setAccessToken(jwt({ pseudo: 'Yutsa', preferred_username: 'player@example.test' }));
    expect(auth.username()).toBe('Yutsa');
    auth.setAccessToken(jwt({ preferred_username: 'player@example.test', email: 'player@example.test' }));
    expect(auth.username()).toBe('Compte');
  });
});

describe('decodeJwtPayload', () => {
  it('reads preferred_username from a JWT and ignores garbage', () => {
    const payload = btoa(JSON.stringify({ preferred_username: 'Yutsa' })).replace(/=+$/, '');
    expect(decodeJwtPayload(`h.${payload}.s`)?.['preferred_username']).toBe('Yutsa');
    expect(decodeJwtPayload('not-a-jwt')).toBeNull();
    expect(decodeJwtPayload(null)).toBeNull();
  });
});
