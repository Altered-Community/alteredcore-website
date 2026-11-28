import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, type Observable } from 'rxjs';
import { AuthSession } from '../../core/auth-session';
import { GuestDeckService } from '../../core/guest-deck.service';
import { DecksCatalogStore } from './decks-catalog.store';

class TestAuthSession extends AuthSession {
  readonly token = signal<string | null>(null).asReadonly();
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

async function settle(): Promise<void> {
  await TestBed.inject(ApplicationRef).whenStable();
  TestBed.tick();
}

describe('DecksCatalogStore', () => {
  let store: DecksCatalogStore;
  let http: HttpTestingController;
  let auth: TestAuthSession;

  beforeEach(() => {
    localStorage.clear();
    auth = new TestAuthSession();
    TestBed.configureTestingModule({
      providers: [DecksCatalogStore, provideHttpClient(), provideHttpClientTesting(), { provide: AuthSession, useValue: auth }],
    });
    store = TestBed.inject(DecksCatalogStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads account decks and performs optimistic like toggle with rollback on error', async () => {
    TestBed.tick();
    http.expectOne((r) => r.method === 'GET' && r.url.includes('/api/decks')).flush([
      {
        id: 'd1',
        name: 'Moyo Rush',
        format: 'standard',
        isPublic: true,
        isDraft: false,
        upvoteCount: 3,
        hasUpvoted: false,
        cards: [{ cardReference: 'ALT_CORE_B_YZ_01_C', quantity: 1, name: 'Moyo', factionCode: 'YZ', cardTypeReference: 'HERO' }],
      },
    ]);
    await settle();
    expect(store.list().map((d) => [d.id, d.likes, d.liked])).toEqual([['d1', 3, false]]);

    // Optimistic increment, then server failure rolls back.
    const unauthorizedCalls: number[] = [];
    store.toggleLike(store.list()[0], () => unauthorizedCalls.push(1));
    expect(store.list()[0]).toMatchObject({ likes: 4, liked: true });
    http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/api/decks/d1/upvote')).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(store.list()[0]).toMatchObject({ likes: 3, liked: false });
    expect(unauthorizedCalls).toEqual([1]);

    // Successful toggle applies API response.
    store.toggleLike(store.list()[0]);
    expect(store.list()[0]).toMatchObject({ likes: 4, liked: true });
    http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/api/decks/d1/upvote')).flush({ upvoteCount: 5, hasUpvoted: true });
    expect(store.list()[0]).toMatchObject({ likes: 5, liked: true });
  });

  it('migrates local guest decks to the account and removes them from localStorage', async () => {
    const guests = TestBed.inject(GuestDeckService);
    guests.create({
      name: 'Local Moyo',
      format: 'standard',
      isPublic: false,
      hero: { reference: 'ALT_CORE_B_YZ_01_C', name: 'Moyo', faction: 'YZ' },
      deckCards: [{ cardReference: 'ALT_CORE_B_YZ_01_C', quantity: 1 }],
    });
    TestBed.tick();
    http.expectOne((r) => r.method === 'GET' && r.url.includes('/api/decks')).flush([]);
    await settle();
    expect(store.localDecks().length).toBe(1);

    const createdIds: string[] = [];
    store.saveLocalDecks((id) => createdIds.push(id));
    const post = http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/api/decks'));
    expect(post.request.body).toMatchObject({ name: 'Local Moyo', isPublic: false, isDraft: false });
    post.flush({ id: 'srv-1', name: 'Local Moyo', format: 'standard' });
    TestBed.tick();
    http.expectOne((r) => r.method === 'GET' && r.url.includes('/api/decks')).flush([{ id: 'srv-1', name: 'Local Moyo', format: 'standard' }]);
    await settle();

    expect(createdIds).toEqual(['srv-1']);
    expect(store.localDecks()).toEqual([]);
  });
});
