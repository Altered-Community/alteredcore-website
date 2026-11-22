import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, type Observable } from 'rxjs';
import { AuthSession } from './auth-session';
import { CardsApiService } from './cards-api.service';
import { DeckCreateFailurePrompt, type DeckCreateFailureChoice } from './deck-create-failure';
import { DeckStore, cardsWithDefaults } from './deck-store';
import { GUEST_DECKS_KEY, GuestDeckService } from './guest-deck.service';
import { OwnershipApiService, type AltArtChoice } from './ownership-api.service';
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

    let copyId = '';
    store.duplicate(store.duplicateName()).subscribe((id) => (copyId = id));
    expect(stored().find((d) => d.id === copyId)).toMatchObject({ name: 'Nouveau nom (copie)', isPublic: false, guest: true });

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

  it('is opening from the request to the answer, and not after an error', async () => {
    store.load('slow');
    TestBed.tick();
    expect(store.opening()).toBe(true);
    http.expectOne((r) => r.url.endsWith('/api/decks/slow')).flush({ id: 'slow', name: 'Lent', format: 'standard', cards: [] });
    await settle();
    expect(store.opening()).toBe(false);
    store.load('gone');
    TestBed.tick();
    expect(store.opening()).toBe(true);
    http.expectOne((r) => r.url.endsWith('/api/decks/gone')).flush({}, { status: 404, statusText: 'Not Found' });
    await settle();
    expect(store.opening()).toBe(false);
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

  it('tells an unknown deck (404) and an unreachable API apart', async () => {
    store.load('missing');
    TestBed.tick();
    http.expectOne((r) => r.url.endsWith('/api/decks/missing')).flush({}, { status: 404, statusText: 'Not Found' });
    await settle();
    expect(store.loadError()).toBe('notFound');
    expect(store.error()).toBe('Deck introuvable.');
    store.load('down');
    TestBed.tick();
    http.expectOne((r) => r.url.endsWith('/api/decks/down')).flush({}, { status: 502, statusText: 'Bad Gateway' });
    await settle();
    expect(store.loadError()).toBe('server');
    expect(store.error()).toContain('HTTP 502');
  });

  it('takes the legality of a server deck from the decks API', async () => {
    store.load('illegal');
    TestBed.tick();
    http.expectOne((r) => r.url.endsWith('/api/decks/illegal')).flush({
      id: 'illegal',
      name: 'Illégal',
      format: 'standard',
      legal: false,
      formatErrors: ['Card ALT_X is banned'],
      legalityDetail: { global: false, hero: true, bannedCards: false },
      cards: [{ cardReference: 'ALT_CORE_B_LY_03_C', quantity: 1, name: 'Fen & Crowbar', factionCode: 'LY', cardTypeReference: 'HERO' }],
    });
    await settle();
    expect(store.legality()).toEqual({ state: 'illegal', rules: ['bannedCards'], errors: ['Card ALT_X is banned'] });
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

/** Given with `useValue`: `useClass` would go through the factory `AuthSession` declares (a guest). */
class SignedIn extends AuthSession {
  readonly token = signal<string | null>(null).asReadonly();
  /** Set to false to end the session (expired). */
  readonly loggedIn = signal(true);
  readonly isLoggedIn = this.loggedIn.asReadonly();
  readonly username = signal<string | null>('alice').asReadonly();
  readonly sessionRestoring = signal(false).asReadonly();
  readonly sessionNotice = signal<string | null>(null).asReadonly();
  ensureFresh(): Observable<void> {
    return of(undefined);
  }
  refresh(): Observable<boolean> {
    return of(false);
  }
}

describe('DeckStore (signed in)', () => {
  let store: DeckStore;
  let http: HttpTestingController;
  let session: SignedIn;

  beforeEach(async () => {
    localStorage.clear();
    session = new SignedIn();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), { provide: AuthSession, useValue: session }] });
    store = TestBed.inject(DeckStore);
    http = TestBed.inject(HttpTestingController);
    store.load('source');
    TestBed.tick();
    http.expectOne((r) => r.url.endsWith('/api/decks/source')).flush({
      id: 'source',
      name: 'Kojo Havre',
      description: 'Aggro',
      format: 'nuc',
      isPublic: true,
      isDraft: false,
      cards: [
        { cardReference: 'ALT_CORE_B_LY_03_C', quantity: 1, name: 'Fen & Crowbar', factionCode: 'LY', cardTypeReference: 'HERO' },
        { cardReference: 'ALT_CORE_B_LY_04_C', quantity: 2, name: 'Martengale', factionCode: 'LY', cardTypeReference: 'CHARACTER' },
      ],
    });
    // The account list (ownership) is fetched once the deck is applied; answer it before settling.
    await Promise.resolve();
    TestBed.tick();
    http.expectOne((r) => r.method === 'GET' && r.url.endsWith('/api/decks')).flush([{ id: 'source' }, { id: 'other' }]);
    await settle();
  });

  afterEach(() => http.verify());

  it('duplicates the deck on the account, private, under the chosen name', () => {
    expect(store.duplicateName()).toBe('Kojo Havre (copie)');
    let copyId = '';
    store.duplicate('Ma copie').subscribe((id) => (copyId = id));
    const req = http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/api/decks'));
    expect(req.request.body).toEqual({
      name: 'Ma copie',
      format: 'nuc',
      isPublic: false,
      isDraft: false,
      description: 'Aggro',
      deckCards: [
        { cardReference: 'ALT_CORE_B_LY_03_C', quantity: 1 },
        { cardReference: 'ALT_CORE_B_LY_04_C', quantity: 2 },
      ],
    });
    req.flush({ id: 'copy', name: 'Ma copie' });
    expect(copyId).toBe('copy');
    expect(stored()).toEqual([]);
  });

  it('reports a refused copy with the API violations', () => {
    let message = '';
    store.duplicate('').subscribe({ error: (e: Error) => (message = e.message) });
    http
      .expectOne((r) => r.method === 'POST' && r.url.endsWith('/api/decks'))
      .flush({ violations: [{ propertyPath: 'name', message: 'Trop long' }] }, { status: 422, statusText: 'Unprocessable' });
    expect(message).toBe('Impossible de dupliquer ce deck (HTTP 422).\nname : Trop long');
  });

  const patchReq = () => http.expectOne((r) => r.method === 'PATCH' && r.url.endsWith('/api/decks/source'));

  it('saves name, description and a draft flag that follows the legality', () => {
    store.updateSettings({ name: '  Kojo Contrôle ', description: ' Midrange ' });
    store.flush();
    const req = patchReq();
    expect(req.request.body).toEqual({
      name: 'Kojo Contrôle',
      description: 'Midrange',
      format: 'nuc',
      isPublic: true,
      // 3 cards: not a legal deck, so a draft (as the site's builder does).
      isDraft: true,
      deckCards: [
        { cardReference: 'ALT_CORE_B_LY_03_C', quantity: 1 },
        { cardReference: 'ALT_CORE_B_LY_04_C', quantity: 2 },
      ],
    });
    expect(req.request.keepalive).toBe(false);
    expect(store.saveState()).toBe('saving');
    req.flush({ id: 'source', name: 'Kojo Contrôle', legal: false });
    expect(store.saveState()).toBe('saved');
    expect(store.isDraft()).toBe(true);
    expect(store.dirty()).toBe(false);
  });

  it('keeps the editor on a failed save, with the API violations, and retries', () => {
    store.rename('Trop long');
    expect(store.saveState()).toBe('pending');
    store.flush();
    patchReq().flush(
      { '@type': 'ConstraintViolationList', violations: [{ propertyPath: 'name', message: 'Ce nom est trop long.' }] },
      { status: 422, statusText: 'Unprocessable Content' },
    );
    expect(store.error()).toBeNull();
    expect(store.loadError()).toBeNull();
    expect(store.saveState()).toBe('error');
    expect(store.saveError()).toBe('Échec de l’enregistrement (HTTP 422).\nname : Ce nom est trop long.');
    expect(store.dirty()).toBe(true);
    expect(store.name()).toBe('Trop long');

    store.retrySave();
    expect(store.saveError()).toBeNull();
    patchReq().flush({ id: 'source', name: 'Trop long' });
    expect(store.saveState()).toBe('saved');
  });

  it('shows the problem detail of a refused save, and a sign-in hint on 401', () => {
    store.rename('A');
    store.flush();
    patchReq().flush({ title: 'An error occurred', detail: 'Deck is locked' }, { status: 409, statusText: 'Conflict' });
    expect(store.saveError()).toBe('Échec de l’enregistrement (HTTP 409).\nDeck is locked');
    store.retrySave();
    patchReq().flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(store.saveError()).toBe('Enregistrement refusé : reconnectez-vous (HTTP 401).');
  });

  it('sends one save at a time and the latest state last', () => {
    store.rename('Un');
    store.flush();
    const first = patchReq();
    store.rename('Deux');
    store.flush();
    http.expectNone((r) => r.method === 'PATCH');
    first.flush({ id: 'source', name: 'Un' });
    // The answer to « Un » does not mark « Deux » as saved.
    expect(store.dirty()).toBe(true);
    const second = patchReq();
    expect(second.request.body).toMatchObject({ name: 'Deux' });
    second.flush({ id: 'source', name: 'Deux' });
    expect(store.dirty()).toBe(false);
    expect(store.saveState()).toBe('saved');
  });

  it('saveNow() writes a pending change at once and tells when every change is saved', () => {
    const results: boolean[] = [];
    store.saveNow().subscribe((ok) => results.push(ok));
    expect(results).toEqual([true]);

    store.rename('Un');
    store.saveNow().subscribe((ok) => results.push(ok));
    const first = patchReq();
    // A change made while it is sent is part of what « Partager » waits for.
    store.rename('Deux');
    store.saveNow().subscribe((ok) => results.push(ok));
    first.flush({ id: 'source', name: 'Un' });
    expect(results).toEqual([true]);
    const second = patchReq();
    expect(second.request.body).toMatchObject({ name: 'Deux' });
    second.flush({ id: 'source', name: 'Deux' });
    expect(results).toEqual([true, true, true]);
    expect(store.saveState()).toBe('saved');
  });

  it('saveNow() says why when the session is gone and the changes cannot be sent', () => {
    store.rename('Un');
    session.loggedIn.set(false);
    const results: boolean[] = [];
    store.saveNow().subscribe((ok) => results.push(ok));
    http.expectNone((r) => r.method === 'PATCH');
    expect(results).toEqual([false]);
    expect(store.saveError()).toBe('Enregistrement refusé : reconnectez-vous (HTTP 401).');
  });

  it('saveNow() emits false on a failed save, and sends it again the next time', () => {
    const results: boolean[] = [];
    store.rename('Un');
    store.saveNow().subscribe((ok) => results.push(ok));
    patchReq().flush({}, { status: 500, statusText: 'Server Error' });
    expect(results).toEqual([false]);
    expect(store.saveState()).toBe('error');

    store.saveNow().subscribe((ok) => results.push(ok));
    patchReq().flush({ id: 'source', name: 'Un' });
    expect(results).toEqual([false, true]);
    expect(store.saveError()).toBeNull();
  });

  it('sends the save of the next deck that waited for the previous deck’s request', async () => {
    store.rename('Un');
    store.flush();
    const first = patchReq();
    store.load('other');
    TestBed.tick();
    http.expectOne((r) => r.url.endsWith('/api/decks/other')).flush({ id: 'other', name: 'Autre', format: 'standard', isPublic: false, cards: [] });
    // The account list is kept: it is not fetched again for each deck opened.
    await settle();
    http.expectNone((r) => r.method === 'GET' && r.url.endsWith('/api/decks'));
    store.rename('Autre deck');
    store.flush();
    http.expectNone((r) => r.method === 'PATCH');
    first.flush({ id: 'source', name: 'Un' });
    const second = http.expectOne((r) => r.method === 'PATCH' && r.url.endsWith('/api/decks/other'));
    expect(second.request.body).toMatchObject({ name: 'Autre deck' });
    second.flush({ id: 'other', name: 'Autre deck' });
    expect(store.dirty()).toBe(false);
  });

  it('still writes a change queued behind a running save when another deck is opened meanwhile', async () => {
    store.rename('Un');
    store.flush();
    const first = patchReq();
    store.rename('Deux');
    store.flush();
    store.load('other');
    TestBed.tick();
    http.expectOne((r) => r.url.endsWith('/api/decks/other')).flush({ id: 'other', name: 'Autre', format: 'standard', isPublic: false, cards: [] });
    await settle();
    first.flush({ id: 'source', name: 'Un' });
    // « Deux » was queued for « source »: it goes to « source », not to the deck open now.
    const queued = patchReq();
    expect(queued.request.body).toMatchObject({ name: 'Deux' });
    queued.flush({ id: 'source', name: 'Deux' });
    expect(store.name()).toBe('Autre');
    http.expectNone((r) => r.method === 'PATCH');
  });

  it('sends the current state again when an older save answers after a newer keepalive one', () => {
    store.rename('Un');
    store.flush();
    const plain = patchReq();
    store.rename('Deux');
    store.flush({ keepalive: true });
    const kept = patchReq();
    expect(kept.request.body).toMatchObject({ name: 'Deux' });
    kept.flush({ id: 'source', name: 'Deux' });
    plain.flush({ id: 'source', name: 'Un' });
    // « Un » may have been written after « Deux »: « Deux » is sent again.
    const again = patchReq();
    expect(again.request.body).toMatchObject({ name: 'Deux' });
    again.flush({ id: 'source', name: 'Deux' });
    http.expectNone((r) => r.method === 'PATCH');
  });

  it('does not save a blank name while it is typed', () => {
    store.rename('  ');
    expect(store.dirty()).toBe(false);
    store.flush();
    http.expectNone((r) => r.method === 'PATCH');
  });

  it('keeps the deck open when a delete fails, with the reason in actionError', () => {
    let ok: boolean | undefined;
    store.delete().subscribe((r) => (ok = r));
    http.expectOne((r) => r.method === 'DELETE').flush({}, { status: 500, statusText: 'Server Error' });
    expect(ok).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.actionError()).toBe('Impossible de supprimer ce deck (HTTP 500).');
    expect(store.deckId()).toBe('source');
  });

  it('flushes with keepalive when the page is left, and warns only when changes may be lost', () => {
    store.rename('Avant de partir');
    expect(store.leavePage()).toBe(false);
    const req = patchReq();
    expect(req.request.keepalive).toBe(true);
    expect(req.request.body).toMatchObject({ name: 'Avant de partir' });
    req.flush({}, { status: 500, statusText: 'Server Error' });

    // The last save failed: resent with keepalive, but the browser asks before leaving.
    expect(store.leavePage()).toBe(true);
    const retry = patchReq();
    expect(retry.request.keepalive).toBe(true);
    retry.flush({ id: 'source', name: 'Avant de partir' });
    expect(store.leavePage()).toBe(false);
    http.expectNone((r) => r.method === 'PATCH');
  });

  it('resends a plain running save with keepalive when the page is left', () => {
    store.rename('En cours');
    store.flush();
    const plain = patchReq();
    expect(store.leavePage()).toBe(false);
    const kept = patchReq();
    expect(kept.request.keepalive).toBe(true);
    plain.flush({ id: 'source', name: 'En cours' });
    kept.flush({ id: 'source', name: 'En cours' });
    expect(store.saveState()).toBe('saved');
  });
});

describe('DeckStore.createDeck (signed in)', () => {
  let store: DeckStore;
  let http: HttpTestingController;
  let choices: DeckCreateFailureChoice[];
  let asked: string[];
  const input = { name: 'Moyo', hero, format: 'standard' as const, isPublic: false, description: ' Rush ' };
  const postReq = () => http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/api/decks'));

  beforeEach(() => {
    localStorage.clear();
    asked = [];
    choices = [];
    const prompt: DeckCreateFailurePrompt = {
      ask: (message: string) => {
        asked.push(message);
        return of(choices.shift() ?? 'cancel');
      },
    };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthSession, useValue: new SignedIn() },
        { provide: DeckCreateFailurePrompt, useValue: prompt },
      ],
    });
    store = TestBed.inject(DeckStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('creates a draft with its description on the account', () => {
    let id = '';
    store.createDeck(input).subscribe((d) => (id = d.id));
    const req = postReq();
    expect(req.request.body).toEqual({
      name: 'Moyo',
      format: 'standard',
      isPublic: false,
      isDraft: true,
      description: 'Rush',
      deckCards: [{ cardReference: hero.reference, quantity: 1 }],
    });
    req.flush({ id: 'new-id', name: 'Moyo' });
    expect(id).toBe('new-id');
    expect(asked).toEqual([]);
  });

  it('asks before keeping a refused deck in this browser', () => {
    choices = ['local'];
    let deck: Deck | undefined;
    store.createDeck(input).subscribe((d) => (deck = d));
    postReq().flush({ violations: [{ propertyPath: 'format', message: 'Format inconnu' }] }, { status: 422, statusText: 'Unprocessable' });
    expect(asked).toEqual(['Impossible de créer le deck sur votre compte (HTTP 422).\nformat : Format inconnu']);
    expect(deck?.guest).toBe(true);
    expect(stored()[0]).toMatchObject({ name: 'Moyo', description: 'Rush' });
  });

  it('retries, or creates nothing when the user cancels', () => {
    choices = ['retry'];
    let deck: Deck | undefined;
    store.createDeck(input).subscribe((d) => (deck = d));
    postReq().flush({}, { status: 503, statusText: 'Unavailable' });
    postReq().flush({ id: 'second-try', name: 'Moyo' });
    expect(deck?.id).toBe('second-try');

    let completed = false;
    let emitted = false;
    store.createDeck(input).subscribe({ next: () => (emitted = true), complete: () => (completed = true) });
    postReq().error(new ProgressEvent('error'));
    expect(asked.at(-1)).toBe('Erreur de connexion.');
    expect(emitted).toBe(false);
    expect(completed).toBe(true);
    expect(stored()).toEqual([]);
  });
});

describe('DeckStore.moveToAccount (signed in)', () => {
  let store: DeckStore;
  let http: HttpTestingController;
  const postReq = () => http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/api/decks'));

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), { provide: AuthSession, useValue: new SignedIn() }] });
    store = TestBed.inject(DeckStore);
    http = TestBed.inject(HttpTestingController);
    store.create({ name: 'Moyo', hero, format: 'standard', isPublic: false, description: 'Rush' });
    store.setQuantity(zou, 2);
  });

  afterEach(() => http.verify());

  it('creates the guest deck on the account, removes it from this device and opens the account deck', () => {
    const guestId = store.deckId();
    let id: string | null = null;
    store.moveToAccount().subscribe((r) => (id = r));
    // The guest copy is written before the request: it stays if the account refuses the deck.
    expect(stored()[0].deckCards?.map((l) => l.cardReference)).toEqual([hero.reference, zou.reference]);
    const req = postReq();
    expect(req.request.body).toEqual({
      name: 'Moyo',
      format: 'standard',
      isPublic: false,
      isDraft: true,
      description: 'Rush',
      deckCards: [
        { cardReference: hero.reference, quantity: 1 },
        { cardReference: zou.reference, quantity: 2 },
      ],
    });
    req.flush({ id: 'account-deck', name: 'Moyo' });
    expect(id).toBe('account-deck');
    expect(stored().find((d) => d.id === guestId)).toBeUndefined();
    expect(store.deckId()).toBe('account-deck');
    expect(store.isGuest()).toBe(false);
    expect(store.owned()).toBe(true);
    expect(store.quantityOf(zou.reference)).toBe(2);
  });

  it('keeps the guest deck on this device when the account refuses it', () => {
    const guestId = store.deckId();
    let id: string | null = 'unset';
    store.moveToAccount().subscribe((r) => (id = r));
    postReq().flush({}, { status: 500, statusText: 'Server Error' });
    expect(id).toBeNull();
    expect(store.saveError()).toBe('Impossible d’enregistrer le deck sur votre compte (HTTP 500).');
    expect(store.deckId()).toBe(guestId);
    expect(stored().map((d) => d.id)).toEqual([guestId]);
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

describe('DeckStore (signed in, default alt arts)', () => {
  const martengale: AltArtChoice = {
    family: { familyId: 9, faction: 'LY', rarity: 'C' },
    options: {
      options: [
        { reference: 'ALT_CORE_B_LY_04_C', ownedQuantity: null },
        { reference: 'ALT_CORE_A_LY_04_C', ownedQuantity: 3 },
      ],
      slots: [1, 2, 3].map((slotIndex) => ({ slotIndex, reference: 'ALT_CORE_A_LY_04_C' })),
    },
  };

  function setup(mine: string[]) {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthSession, useValue: new SignedIn() },
        { provide: OwnershipApiService, useValue: { altArtChoices: (refs: string[]) => of(refs.includes('ALT_CORE_B_LY_04_C') ? { ALT_CORE_B_LY_04_C: martengale } : {}) } },
      ],
    });
    const store = TestBed.inject(DeckStore);
    const http = TestBed.inject(HttpTestingController);
    return { store, http, mine: mine.map((id) => ({ id })) };
  }

  async function open(store: DeckStore, http: HttpTestingController, mine: { id: string }[]) {
    store.load('source');
    TestBed.tick();
    http.expectOne((r) => r.url.endsWith('/api/decks/source')).flush({
      id: 'source',
      name: 'Kojo',
      format: 'standard',
      cards: [
        { cardReference: 'ALT_CORE_B_LY_03_C', quantity: 1, name: 'Fen & Crowbar', factionCode: 'LY', cardTypeReference: 'HERO' },
        { cardReference: 'ALT_CORE_B_LY_04_C', quantity: 2, name: 'Martengale', factionCode: 'LY', cardTypeReference: 'CHARACTER' },
      ],
    });
    await Promise.resolve();
    TestBed.tick();
    http.expectOne((r) => r.method === 'GET' && r.url.endsWith('/api/decks')).flush(mine);
    await settle();
  }

  it('copies someone else’s deck with the user’s default alt arts', async () => {
    const { store, http, mine } = setup([]);
    await open(store, http, mine);
    store.duplicate('Copie').subscribe();
    const req = http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/api/decks'));
    expect(req.request.body.deckCards.map((c: { cardReference: string; quantity: number }) => [c.cardReference, c.quantity])).toEqual([
      ['ALT_CORE_B_LY_03_C', 1],
      ['ALT_CORE_A_LY_04_C', 2],
    ]);
    req.flush({ id: 'copy' });
    http.verify();
  });

  it('copies the user’s own deck with its illustrations', async () => {
    const { store, http, mine } = setup(['source']);
    await open(store, http, mine);
    store.duplicate('Copie').subscribe();
    const req = http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/api/decks'));
    expect(req.request.body.deckCards.map((c: { cardReference: string }) => c.cardReference)).toEqual(['ALT_CORE_B_LY_03_C', 'ALT_CORE_B_LY_04_C']);
    req.flush({ id: 'copy' });
    http.verify();
  });

  it('adds and removes the copies of a family by the defaults, and applies them to the whole deck', async () => {
    const { store, http, mine } = setup(['source']);
    await open(store, http, mine);
    const card = store.lines().find((l) => l.card.reference === 'ALT_CORE_B_LY_04_C')!.card;
    const members = new Set(['ALT_CORE_B_LY_04_C', 'ALT_CORE_A_LY_04_C']);
    // 2 plain copies in the deck: the 3rd copy takes the 3rd default.
    store.setFamilyQuantity(card, martengale, members, 3);
    expect(store.lines().map((l) => [l.card.reference, l.quantity])).toEqual([
      ['ALT_CORE_B_LY_04_C', 2],
      ['ALT_CORE_A_LY_04_C', 1],
    ]);
    expect(store.lastChange()).toMatchObject({ card: { reference: 'ALT_CORE_A_LY_04_C' }, quantity: 1, delta: 1 });
    expect(store.applyAltArtDefaults({ ALT_CORE_B_LY_04_C: martengale, ALT_CORE_A_LY_04_C: martengale })).toBe(true);
    expect(store.lines().map((l) => [l.card.reference, l.quantity])).toEqual([['ALT_CORE_A_LY_04_C', 3]]);
    store.setFamilyQuantity(card, martengale, members, 1);
    expect(store.lines().map((l) => [l.card.reference, l.quantity])).toEqual([['ALT_CORE_A_LY_04_C', 1]]);
    store.flush();
    http.match(() => true);
  });
});

describe('cardsWithDefaults', () => {
  it('rewrites deck lines with the defaults, a new print copying its family’s line', () => {
    const choice: AltArtChoice = {
      family: { familyId: 1, faction: 'AX', rarity: 'C' },
      options: { options: [{ reference: 'ALT_B', ownedQuantity: null }, { reference: 'ALT_A', ownedQuantity: 1 }], slots: [{ slotIndex: 1, reference: 'ALT_A' }] },
    };
    expect(cardsWithDefaults([{ cardReference: 'ALT_B', quantity: 2, name: 'X' }], { ALT_B: choice })).toEqual([
      { cardReference: 'ALT_A', quantity: 1, name: 'X' },
      { cardReference: 'ALT_B', quantity: 1, name: 'X' },
    ]);
  });
});
