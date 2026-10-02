import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, type TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { Card } from '../../core/models';
import { CardSearchStore, PAGE_SIZE, SLOW_MS } from './card-search.store';

const page = (n: number, size: number): Card[] =>
  Array.from({ length: size }, (_, i) => ({ reference: `ALT_CORE_B_YZ_${n}${String(i).padStart(2, '0')}_C` }));

describe('CardSearchStore (infinite scroll)', () => {
  let store: CardSearchStore;
  let http: HttpTestingController;
  /** Runs the resource so its request goes out. */
  const pending = () => {
    TestBed.tick();
    return http.match((r) => r.url.endsWith('/api/cards'));
  };
  /** Same, on the Uniques search API. */
  const pendingUniques = () => {
    TestBed.tick();
    return http.match((r) => r.url.endsWith('/api/v2/cards'));
  };
  const uniques = (n: number, size: number) => page(n, size).map((c) => ({ reference: c.reference.replace(/_C$/, '_U_1') }));
  /** Not `whenStable()`: with the sentinel visible the store chains the next page, so the app never goes idle. */
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
  };
  /** Answers a request and lets the response reach the store (it lands in a microtask). */
  const answer = async (req: TestRequest, n: number, last = 4) => {
    req.flush({ member: page(n, PAGE_SIZE.all), totalItems: PAGE_SIZE.all * last, currentPage: n, itemsPerPage: PAGE_SIZE.all, lastPage: last });
    await settle();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [CardSearchStore, provideHttpClient(), provideHttpClientTesting()] });
    store = TestBed.inject(CardSearchStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads page 1 scoped to the hero faction', async () => {
    store.configure('all', 'YZ');
    const [req] = pending();
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('faction.code')).toBe('YZ');
    expect(req.request.params.get('itemsPerPage')).toBe(String(PAGE_SIZE.all));
    await answer(req, 1);
    expect(store.cards().length).toBe(PAGE_SIZE.all);
    expect(store.total()).toBe(PAGE_SIZE.all * 4);
    expect(store.hasMore()).toBe(true);
    expect(store.timings()).toHaveLength(1);
  });

  it('chains pages while the lookahead sentinel stays visible, then stops at the last page', async () => {
    store.configure('all', 'YZ');
    await answer(pending()[0], 1);
    store.setWantMore(true);
    await answer(pending()[0], 2);
    await answer(pending()[0], 3);
    store.setWantMore(false);
    await answer(pending()[0], 4);
    expect(pending()).toHaveLength(0);
    expect(store.cards().length).toBe(PAGE_SIZE.all * 4);
    expect(store.hasMore()).toBe(false);
  });

  it('never runs two page requests at once', async () => {
    store.configure('all', null);
    store.loadMore();
    store.loadMore();
    const reqs = pending();
    expect(reqs).toHaveLength(1);
    await answer(reqs[0], 1);
    store.loadMore();
    store.loadMore();
    const next = pending();
    expect(next).toHaveLength(1);
    expect(next[0].request.params.get('page')).toBe('2');
    await answer(next[0], 2);
  });

  it('restarts from page 1 and drops stale responses when filters change', async () => {
    store.configure('all', 'YZ');
    const stale = pending()[0];
    store.patch({ q: 'zou' });
    const fresh = pending().find((r) => r.request.params.get('name') === 'zou')!;
    expect(stale.cancelled).toBe(true);
    await answer(fresh, 1, 1);
    expect(store.page()).toBe(1);
    expect(store.hasMore()).toBe(false);
  });

  it('applying the same filters again restarts from page 1, served from the session cache', async () => {
    store.configure('all', 'YZ');
    await answer(pending()[0], 1);
    store.setWantMore(true);
    await answer(pending()[0], 2);
    store.setWantMore(false);
    await answer(pending()[0], 3);
    store.apply(store.filters());
    expect(pending()).toHaveLength(0);
    await settle();
    expect(store.page()).toBe(1);
    expect(store.cards().length).toBe(PAGE_SIZE.all);
  });

  it('queries uniques on the Uniques search API and pages with its cursor', async () => {
    store.configure('uniques', 'LY');
    expect(pending()).toHaveLength(0);
    const [req] = pendingUniques();
    expect(req.request.params.getAll('faction[]')).toEqual(['LY']);
    expect(req.request.params.get('limit')).toBe(String(PAGE_SIZE.uniques));
    expect(req.request.params.has('cursor')).toBe(false);
    req.flush({ iter: { total: PAGE_SIZE.uniques + 2, cursor: 1234 }, cards: uniques(1, PAGE_SIZE.uniques) });
    await settle();
    expect(store.total()).toBe(PAGE_SIZE.uniques + 2);
    expect(store.hasMore()).toBe(true);

    store.loadMore();
    const [next] = pendingUniques();
    expect(next.request.params.get('cursor')).toBe('1234');
    next.flush({ iter: { total: PAGE_SIZE.uniques + 2 }, cards: uniques(2, 2) });
    await settle();
    expect(store.cards().length).toBe(PAGE_SIZE.uniques + 2);
    expect(store.page()).toBe(2);
    expect(store.hasMore()).toBe(false);
  });

  it('flags a page that is still loading after SLOW_MS, and clears it on response', async () => {
    vi.useFakeTimers();
    try {
      store.configure('uniques', 'AX');
      const [req] = pendingUniques();
      vi.advanceTimersByTime(SLOW_MS - 100);
      expect(store.slow()).toBe(false);
      vi.advanceTimersByTime(200);
      expect(store.slow()).toBe(true);
      req.flush({ iter: { total: 3 }, cards: uniques(1, 3) });
      await vi.advanceTimersByTimeAsync(0);
      TestBed.tick();
      expect(store.loading()).toBe(false);
      expect(store.slow()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('exposes timeouts as a retryable error', async () => {
    store.configure('uniques', 'AX');
    const [req] = pendingUniques();
    req.flush('error code: 504', { status: 504, statusText: 'Gateway Timeout' });
    await settle();
    expect(store.error()).toContain('trop de temps');
    store.retry();
    pendingUniques()[0].flush({ iter: { total: 1 }, cards: uniques(1, 1) });
    await settle();
    expect(store.error()).toBeNull();
  });

  it('does not query the cards API for login-only sources', () => {
    store.configure('owned', 'AX');
    expect(pending()).toHaveLength(0);
    expect(store.total()).toBe(0);
    expect(store.hasMore()).toBe(false);
  });
});
