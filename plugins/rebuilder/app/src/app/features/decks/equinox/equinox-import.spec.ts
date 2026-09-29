import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError, type Observable } from 'rxjs';
import { AuthSession } from '../../../core/auth-session';
import { DecksApiService } from '../../../core/decks-api.service';
import type { Deck, DeckWrite } from '../../../core/models';
import { OwnershipApiService, type CardQuantity } from '../../../core/ownership-api.service';
import { EquinoxImport } from './equinox-import';

/** A ZIP with one stored entry. */
function zipFile(name: string, text: string): File {
  const enc = new TextEncoder();
  const path = enc.encode(name);
  const data = enc.encode(text);
  const local = new DataView(new ArrayBuffer(30));
  local.setUint32(0, 0x04034b50, true);
  local.setUint32(18, data.length, true);
  local.setUint32(22, data.length, true);
  local.setUint16(26, path.length, true);
  const cd = new DataView(new ArrayBuffer(46));
  cd.setUint32(0, 0x02014b50, true);
  cd.setUint32(20, data.length, true);
  cd.setUint32(24, data.length, true);
  cd.setUint16(28, path.length, true);
  const eocd = new DataView(new ArrayBuffer(22));
  eocd.setUint32(0, 0x06054b50, true);
  eocd.setUint16(8, 1, true);
  eocd.setUint16(10, 1, true);
  eocd.setUint32(12, 46 + path.length, true);
  eocd.setUint32(16, 30 + path.length + data.length, true);
  return new File([local.buffer, path, data, cd.buffer, path, eocd.buffer] as BlobPart[], 'export.zip');
}

const CSV = ['id;name;format;hero;x;ref;x;qty', 'd1;Alpha;standard;ALT_HERO;x;ALT_A;x;3', 'd2;Beta;nuc;ALT_HERO;x;ALT_B;x;2', 'd3;;standard;ALT_HERO;x;ALT_C;x;1'].join('\n');

class SignedIn extends AuthSession {
  readonly token = signal<string | null>(null).asReadonly();
  readonly isLoggedIn = signal(true).asReadonly();
  readonly username = signal<string | null>('alice').asReadonly();
  readonly sessionRestoring = signal(false).asReadonly();
  readonly sessionNotice = signal<string | null>(null).asReadonly();
  ensureFresh(): Observable<void> {
    return of(undefined);
  }
  refresh(): Observable<boolean> {
    return of(true);
  }
}

interface Harness {
  pickFile(file: File | null): void;
  start(): Promise<void>;
  retry(index: number): void;
  togglePause(): void;
  cancel(): void;
  phase(): string;
  rows(): { deck: { name: string }; status: string; attempts: number }[];
}

describe('EquinoxImport', () => {
  let created: DeckWrite[];
  let failNext: number;
  let mine: Deck[];
  let global: boolean;
  let altArts: (cards: CardQuantity[]) => CardQuantity[];
  let mineError: number;

  function setup(): Harness {
    created = [];
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthSession, useClass: SignedIn },
        {
          provide: DecksApiService,
          useValue: {
            listMine: () => (mineError ? throwError(() => new HttpErrorResponse({ status: mineError })) : of({ member: mine })),
            get: (id: string) => of(mine.find((d) => d.id === id)),
            create: (body: DeckWrite) => {
              if (failNext > 0) {
                failNext--;
                return throwError(() => new HttpErrorResponse({ status: 503 }));
              }
              created.push(body);
              return of({ id: `new-${created.length}`, name: body.name } as Deck);
            },
          },
        },
        {
          provide: OwnershipApiService,
          useValue: {
            globalAltArts: () => of(global),
            applyAltArts: (cards: CardQuantity[]) => of(altArts(cards)),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(EquinoxImport);
    fixture.detectChanges();
    return fixture.componentInstance as unknown as Harness;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    failNext = 0;
    mine = [];
    global = false;
    mineError = 0;
    altArts = (cards) => cards.map((c) => ({ ...c, cardReference: `${c.cardReference}_ALT` }));
  });
  afterEach(() => vi.useRealTimers());

  async function run(cmp: Harness): Promise<void> {
    cmp.pickFile(zipFile('export/decks.csv', CSV));
    const started = cmp.start();
    await vi.advanceTimersByTimeAsync(5000);
    await started;
  }

  it('creates each valid deck private, hero first, one per second; a deck without name fails at once', async () => {
    const cmp = setup();
    await run(cmp);
    expect(created).toEqual([
      { name: 'Alpha', format: 'standard', isPublic: false, isDraft: false, deckCards: [{ cardReference: 'ALT_HERO', quantity: 1 }, { cardReference: 'ALT_A', quantity: 3 }] },
      { name: 'Beta', format: 'nuc', isPublic: false, isDraft: false, deckCards: [{ cardReference: 'ALT_HERO', quantity: 1 }, { cardReference: 'ALT_B', quantity: 2 }] },
    ]);
    expect(cmp.rows().map((r) => r.status)).toEqual(['imported', 'imported', 'failedFinal']);
    expect(cmp.phase()).toBe('done');
  });

  it('applies the « Global » alt-art preference to the exported cards, not to the hero', async () => {
    global = true;
    const cmp = setup();
    await run(cmp);
    expect(created[0].deckCards).toEqual([{ cardReference: 'ALT_HERO', quantity: 1 }, { cardReference: 'ALT_A_ALT', quantity: 3 }]);
  });

  it('keeps the exported cards when the alt-art answer holds an invalid card', async () => {
    global = true;
    altArts = (cards) => cards.map((c) => ({ ...c, quantity: 0 }));
    const cmp = setup();
    await run(cmp);
    expect(created[0].deckCards).toEqual([{ cardReference: 'ALT_HERO', quantity: 1 }, { cardReference: 'ALT_A', quantity: 3 }]);
  });

  it('stops before importing when the session has no token', async () => {
    mineError = 401;
    const cmp = setup();
    await run(cmp);
    expect(cmp.phase()).toBe('pick');
    expect(created).toEqual([]);
  });

  it('imports everything, with a warning, when the account decks cannot be listed', async () => {
    mineError = 502;
    mine = [{ id: 'old', name: 'Alpha', deckCards: [{ cardReference: 'ALT_A', quantity: 3 }, { cardReference: 'ALT_HERO', quantity: 1 }] }];
    const cmp = setup();
    await run(cmp);
    expect(created.map((d) => d.name)).toEqual(['Alpha', 'Beta']);
  });

  it('creates two identical decks of one export, as the site does (only account decks are duplicates)', async () => {
    const cmp = setup();
    cmp.pickFile(zipFile('decks.csv', ['id;name;format;hero;x;ref;x;qty', 'd1;Same;standard;ALT_HERO;x;ALT_A;x;1', 'd2;Same;standard;ALT_HERO;x;ALT_A;x;1'].join('\n')));
    const started = cmp.start();
    await vi.advanceTimersByTimeAsync(5000);
    await started;
    expect(created.map((d) => d.name)).toEqual(['Same', 'Same']);
  });

  it('skips a deck already in the account with the same name and cards', async () => {
    mine = [{ id: 'old', name: 'alpha ', deckCards: [{ cardReference: 'ALT_A', quantity: 3 }, { cardReference: 'ALT_HERO', quantity: 1 }] }];
    const cmp = setup();
    await run(cmp);
    expect(cmp.rows().map((r) => r.status)).toEqual(['skipped', 'imported', 'failedFinal']);
    expect(created.map((d) => d.name)).toEqual(['Beta']);
  });

  it('stops on a failed deck until « Réessayer »', async () => {
    failNext = 1;
    const cmp = setup();
    await run(cmp);
    expect(cmp.rows().map((r) => r.status)).toEqual(['failed', 'pending', 'failedFinal']);
    expect(cmp.phase()).toBe('importing');
    cmp.retry(0);
    await vi.advanceTimersByTimeAsync(5000);
    expect(cmp.rows().map((r) => r.status)).toEqual(['imported', 'imported', 'failedFinal']);
  });

  it('gives a deck up after 3 failed attempts and goes on', async () => {
    failNext = 3;
    const again = setup();
    await run(again);
    again.retry(0);
    await vi.advanceTimersByTimeAsync(2000);
    again.retry(0);
    await vi.advanceTimersByTimeAsync(5000);
    expect(again.rows()[0]).toMatchObject({ status: 'failedFinal', attempts: 3 });
    expect(again.rows()[1].status).toBe('imported');
  });

  it('pauses after the current deck, resumes, and cancels what is left', async () => {
    const cmp = setup();
    cmp.pickFile(zipFile('decks.csv', CSV));
    const started = cmp.start();
    await vi.advanceTimersByTimeAsync(0);
    await started;
    cmp.togglePause();
    await vi.advanceTimersByTimeAsync(5000);
    expect(cmp.phase()).toBe('paused');
    const importedWhilePaused = created.length;
    expect(importedWhilePaused).toBeLessThanOrEqual(1);
    cmp.cancel();
    expect(cmp.phase()).toBe('done');
    expect(cmp.rows().filter((r) => r.status === 'cancelled').length).toBe(2 - importedWhilePaused);
  });
});
