import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CardsApiService, buildCardsSearchParams, buildCardsSearchUrl } from './cards-api.service';

describe('buildCardsSearchUrl', () => {
  it('encodes rarity filters against the cards API base', () => {
    const url = buildCardsSearchUrl('https://cards.alteredcore.org', {
      page: 2,
      itemsPerPage: 12,
      q: 'mechanic',
      rarities: ['COMMON', 'RARE'],
    });
    expect(url).toContain('https://cards.alteredcore.org/api/cards');
    expect(url).toContain('page=2');
    expect(url).toContain('name=mechanic');
    expect(url).toContain('rarity');
  });
});

describe('buildCardsSearchParams', () => {
  it('uses the scalar faction filter for one faction (the array form is ignored for uniques)', () => {
    expect(buildCardsSearchParams({ factions: ['AX'] }).get('faction.code')).toBe('AX');
    expect(buildCardsSearchParams({ factions: ['AX', 'LY'] }).getAll('faction.code[]')).toEqual(['AX', 'LY']);
  });

  it('sorts like the site: costs and powers with the default order on ties, random', () => {
    const forest = buildCardsSearchParams({ order: 'forestPower-asc' });
    expect(forest.get('order[forestPower]')).toBe('asc');
    expect(forest.get('order[setDate]')).toBe('desc');
    expect(forest.get('order[collectorNumberFormatedId]')).toBe('asc');
    expect(buildCardsSearchParams({ order: 'random' }).get('random')).toBe('true');
  });

  it('sends explicit cost arrays, order and advanced flags', () => {
    const hp = buildCardsSearchParams({
      mainCosts: [1, 2],
      recallCosts: [3],
      order: 'setDate-desc',
      hasNoEffect: true,
      variations: [],
    });
    expect(hp.getAll('mainCost[]')).toEqual(['1', '2']);
    expect(hp.getAll('recallCost[]')).toEqual(['3']);
    expect(hp.get('order[setDate]')).toBe('desc');
    expect(hp.get('order[cardNumber]')).toBe('asc');
    expect(hp.get('hasNoEffect')).toBe('true');
    expect(hp.has('variation[]')).toBe(false);
  });

  it('switches to reference search for ALT_ codes', () => {
    const hp = buildCardsSearchParams({ q: 'alt_core_b_ax_04_c' });
    expect(hp.get('reference')).toBe('ALT_CORE_B_AX_04_C');
    expect(hp.has('name')).toBe(false);
  });
});

describe('CardsApiService', () => {
  let api: CardsApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(CardsApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('fetches heroes from unified /api/v2/search, groups them, and caches them', () => {
    let first: unknown;
    api.heroes().subscribe((h) => (first = h));
    const req = http.expectOne((r) => r.url.endsWith('/api/v2/search') && !!r.params.getAll('cardType[]')?.includes('HERO'));
    req.flush({
      iter: { total: 2 },
      cards: [
        {
          reference: 'ALT_CORE_P_AX_01_C',
          name: { fr_FR: 'Sierra & Oddball', en_US: 'Sierra & Oddball' },
          faction: { code: 'AX', name: 'Axiom' },
          product: 'P',
        },
        {
          reference: 'ALT_CORE_B_AX_01_C',
          name: { fr_FR: 'Sierra & Oddball', en_US: 'Sierra & Oddball' },
          faction: { code: 'AX', name: 'Axiom' },
          product: 'B',
        },
      ],
    });
    expect(first).toEqual([
      {
        slug: 'AX:sierra & oddball',
        name: 'Sierra & Oddball',
        faction: 'AX',
        reference: 'ALT_CORE_B_AX_01_C',
        prints: [
          { reference: 'ALT_CORE_P_AX_01_C', variation: 'promo' },
          { reference: 'ALT_CORE_B_AX_01_C', variation: 'standard' },
        ],
      },
    ]);
    api.heroes().subscribe();
    http.expectNone((r) => r.url.endsWith('/api/v2/search'));
  });

  it('falls back to /api/card_groups for heroes when unified search fails', () => {
    let first: unknown;
    api.heroes().subscribe((h) => (first = h));
    http
      .expectOne((r) => r.url.endsWith('/api/v2/search') && !!r.params.getAll('cardType[]')?.includes('HERO'))
      .flush('not found', { status: 404, statusText: 'Not Found' });
    const req = http.expectOne((r) => r.url.endsWith('/api/card_groups') && r.params.get('cardType') === 'HERO');
    req.flush({
      member: [
        {
          slug: 'AX-001-C',
          name: { fr: 'Sierra & Oddball', en: 'Sierra & Oddball' },
          faction: { code: 'AX', name: 'Axiom' },
          cards: [
            { reference: 'ALT_CORE_P_AX_01_C', variation: 'promo' },
            { reference: 'ALT_CORE_B_AX_01_C', variation: 'standard' },
          ],
        },
      ],
    });
    expect(first).toEqual([
      {
        slug: 'AX-001-C',
        name: 'Sierra & Oddball',
        faction: 'AX',
        reference: 'ALT_CORE_B_AX_01_C',
        prints: [
          { reference: 'ALT_CORE_P_AX_01_C', variation: 'promo' },
          { reference: 'ALT_CORE_B_AX_01_C', variation: 'standard' },
        ],
      },
    ]);
  });

  it('batches via POST /api/v2/search first and falls back to /api/cards/batch on error', () => {
    let got: unknown;
    api.batch(['ALT_CORE_B_AX_04_C'], 'fr').subscribe((cards) => (got = cards));
    const unified = http.expectOne((r) => r.url.endsWith('/api/v2/search') && r.method === 'POST');
    expect(unified.request.body).toContain('ref[]=ALT_CORE_B_AX_04_C');
    unified.flush({
      iter: { total: 1 },
      cards: [{ reference: 'ALT_CORE_B_AX_04_C', name: { fr_FR: 'Élémentaire de Kélon' }, rarity: { reference: 'COMMON' } }],
    });
    expect((got as { reference: string }[])[0].reference).toBe('ALT_CORE_B_AX_04_C');

    let fallbackGot: unknown;
    api.batch(['ALT_CORE_B_AX_04_C'], 'fr').subscribe((cards) => (fallbackGot = cards));
    http.expectOne((r) => r.url.endsWith('/api/v2/search') && r.method === 'POST').flush('err', { status: 404, statusText: 'Not Found' });
    http.expectOne((r) => r.url.endsWith('/api/cards/batch')).flush([{ reference: 'ALT_CORE_B_AX_04_C' }]);
    expect((fallbackGot as { reference: string }[])[0].reference).toBe('ALT_CORE_B_AX_04_C');
  });

  it('replays a search page already fetched and refetches another one', () => {
    const got: number[] = [];
    api.search({ page: 1, rarities: ['UNIQUE'] }).subscribe((c) => got.push(c.totalItems));
    http.expectOne((r) => r.url.endsWith('/api/cards')).flush({ member: [], totalItems: 7 });
    api.search({ page: 1, rarities: ['UNIQUE'] }).subscribe((c) => got.push(c.totalItems));
    http.expectNone((r) => r.url.endsWith('/api/cards'));
    api.search({ page: 2, rarities: ['UNIQUE'] }).subscribe();
    http.expectOne((r) => r.params.get('page') === '2').flush({ member: [], totalItems: 7 });
    expect(got).toEqual([7, 7]);
  });

  it('refetches a random search each time (a new deal)', () => {
    api.search({ page: 1, order: 'random' }).subscribe();
    http.expectOne((r) => r.params.get('random') === 'true').flush({ member: [], totalItems: 7 });
    api.search({ page: 1, order: 'random' }).subscribe();
    http.expectOne((r) => r.params.get('random') === 'true').flush({ member: [], totalItems: 7 });
  });

  it('does not keep a failed search, and cancels one nobody listens to any more', () => {
    api.search({ page: 1 }).subscribe({ error: () => undefined });
    http.expectOne((r) => r.url.endsWith('/api/cards')).flush('boom', { status: 504, statusText: 'Gateway Timeout' });
    api.search({ page: 1 }).subscribe();
    const retry = http.expectOne((r) => r.url.endsWith('/api/cards'));
    retry.flush({ member: [], totalItems: 0 });

    const sub = api.search({ page: 3 }).subscribe();
    const pending = http.expectOne((r) => r.params.get('page') === '3');
    sub.unsubscribe();
    expect(pending.cancelled).toBe(true);
  });

  it('normalises hydra collections', () => {
    let total = 0;
    api.search({ page: 1, itemsPerPage: 2 }).subscribe((c) => (total = c.lastPage));
    http.expectOne((r) => r.url.endsWith('/api/cards')).flush({ member: [], totalItems: 5, itemsPerPage: 2 });
    expect(total).toBe(3);
  });

  it('sends descending cardNumber order for number-desc', () => {
    api.search({ page: 1, order: 'number-desc' }).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/api/cards'));
    expect(req.request.params.get('order[cardNumber]')).toBe('desc');
    expect(req.request.params.get('order[collectorNumberFormatedId]')).toBe('asc');
    req.flush({ member: [], totalItems: 0 });
  });
});
