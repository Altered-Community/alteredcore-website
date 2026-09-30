import { HttpErrorResponse } from '@angular/common/http';
import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError, type Observable } from 'rxjs';
import { AuthSession } from '../../../core/auth-session';
import { CardsApiService } from '../../../core/cards-api.service';
import { DecksApiService } from '../../../core/decks-api.service';
import { GUEST_DECKS_KEY, GuestDeckService } from '../../../core/guest-deck.service';
import type { Card, Deck, DeckFormat, DeckWrite } from '../../../core/models';
import { ArOverlayRef } from '../../../ui/overlay';
import { ImportDeckOverlay, parseDecklist, type ImportResult } from './import-deck.overlay';

const HERO: Card = { reference: 'ALT_CORE_B_YZ_01_C', name: 'Moyo & Silk', cardType: { reference: 'HERO' }, faction: { code: 'YZ', name: 'Yzmir' } };
const ZOU: Card = { reference: 'ALT_CORE_B_YZ_10_C', name: 'Zou !', cardType: { reference: 'SPELL' } };

class Session extends AuthSession {
  static signedIn = false;
  readonly token = signal<string | null>(null).asReadonly();
  readonly isLoggedIn = signal(Session.signedIn).asReadonly();
  readonly username = signal<string | null>(Session.signedIn ? 'alice' : null).asReadonly();
  readonly sessionRestoring = signal(false).asReadonly();
  readonly sessionNotice = signal<string | null>(null).asReadonly();
  ensureFresh(): Observable<void> {
    return of(undefined);
  }
  refresh(): Observable<boolean> {
    return of(false);
  }
}

interface Harness {
  name: WritableSignal<string>;
  text: WritableSignal<string>;
  format: WritableSignal<DeckFormat>;
  error: WritableSignal<string | null>;
  run(): void;
}

describe('ImportDeckOverlay (list)', () => {
  let created: DeckWrite[];
  let createError: number;
  let batch: () => Observable<Card[]>;
  let closed: (ImportResult | undefined)[];

  function setup(signedIn: boolean): Harness {
    created = [];
    closed = [];
    const ref = new ArOverlayRef<ImportResult, { mode: 'list' }>({ mode: 'list' });
    ref.dialogRef = { close: (r) => closed.push(r as ImportResult | undefined) };
    Session.signedIn = signedIn;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ArOverlayRef, useValue: ref },
        // An instance: `useClass` would run the factory `Session` inherits from `@Service` (a guest).
        { provide: AuthSession, useValue: new Session() },
        { provide: CardsApiService, useValue: { batch: () => batch() } },
        {
          provide: DecksApiService,
          useValue: {
            create: (body: DeckWrite) => {
              if (createError) return throwError(() => new HttpErrorResponse({ status: createError }));
              created.push(body);
              return of({ id: 'server-1', name: body.name } as Deck);
            },
          },
        },
      ],
    });
    const cmp = TestBed.createComponent(ImportDeckOverlay).componentInstance as unknown as Harness;
    cmp.text.set(`1 ${HERO.reference}\n3 ${ZOU.reference}`);
    cmp.name.set('Moyo');
    cmp.format.set('nuc');
    return cmp;
  }

  beforeEach(() => {
    localStorage.clear();
    createError = 0;
    batch = () => of([HERO, ZOU]);
  });

  it('creates an account deck with the chosen format when signed in', () => {
    const cmp = setup(true);
    cmp.run();
    expect(created).toEqual([
      {
        name: 'Moyo',
        format: 'nuc',
        isPublic: false,
        deckCards: [
          { cardReference: HERO.reference, quantity: 1 },
          { cardReference: ZOU.reference, quantity: 3 },
        ],
      },
    ]);
    expect(closed).toEqual([{ deckId: 'server-1' }]);
    expect(TestBed.inject(GuestDeckService).decks()).toEqual([]);
  });

  it('keeps the window open with an error when the API refuses the deck', () => {
    createError = 400;
    const cmp = setup(true);
    cmp.run();
    expect(closed).toEqual([]);
    expect(cmp.error()).toBeTruthy();
    expect(TestBed.inject(GuestDeckService).decks()).toEqual([]);
  });

  it('creates a guest deck with the chosen format when signed out', () => {
    const cmp = setup(false);
    cmp.run();
    expect(created).toEqual([]);
    const saved = JSON.parse(localStorage.getItem(GUEST_DECKS_KEY) ?? '[]') as Deck[];
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ name: 'Moyo', format: 'nuc', hero: { reference: HERO.reference, faction: 'YZ' } });
    expect(closed).toEqual([{ deckId: saved[0].id }]);
  });

  it('creates nothing when the cards cannot be checked, or a reference is unknown', () => {
    batch = () => throwError(() => new HttpErrorResponse({ status: 503 }));
    const failed = setup(true);
    failed.run();
    expect(failed.error()).toBeTruthy();
    TestBed.resetTestingModule();
    batch = () => of([HERO]);
    const unknown = setup(true);
    unknown.run();
    expect(unknown.error()).toContain(ZOU.reference);
    expect(created).toEqual([]);
    expect(closed).toEqual([]);
  });
});

describe('parseDecklist', () => {
  it('adds up the lines of one card, up to 99 copies, and leaves out a line at 0', () => {
    expect(parseDecklist('60 ALT_CORE_B_AX_04_C\nALT_CORE_B_AX_04_C x50\n0 ALT_CORE_B_AX_05_C')).toEqual([{ reference: 'ALT_CORE_B_AX_04_C', quantity: 99 }]);
  });
});
