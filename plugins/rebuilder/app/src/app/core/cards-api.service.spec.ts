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

  it('sorts like the site: name in the card language, costs and powers with the default order on ties, random', () => {
    const name = buildCardsSearchParams({ order: 'name-desc', locale: 'fr' });
    expect(name.get('order[name.fr]')).toBe('desc');
    expect(name.get('order[setDate]')).toBe('desc');
    const forest = buildCardsSearchParams({ order: 'forestPower-asc' });
    expect(forest.get('order[forestPower]')).toBe('asc');
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

  it('maps hero card groups to their standard booster print and caches them', () => {
    let first: unknown;
    api.heroes().subscribe((h) => (first = h));
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
    expect(first).toEqual([{ slug: 'AX-001-C', name: 'Sierra & Oddball', faction: 'AX', reference: 'ALT_CORE_B_AX_01_C' }]);
    api.heroes().subscribe();
    http.expectNone((r) => r.url.endsWith('/api/card_groups'));
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
});
