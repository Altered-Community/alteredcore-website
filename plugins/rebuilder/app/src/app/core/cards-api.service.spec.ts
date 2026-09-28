import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CardsApiService, NO_CONDITION, buildCardsSearchParams, buildCardsSearchUrl, toAbilityRefs } from './cards-api.service';

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

  it('sends explicit cost arrays, effect slots, order and advanced flags', () => {
    const hp = buildCardsSearchParams({
      mainCosts: [1, 2],
      recallCosts: [3],
      effectSlots: [{ trigger: 17 }, { effect: 5 }],
      effectSlotMode: 'and',
      order: 'setDate-desc',
      hasNoEffect: true,
      variations: [],
    });
    expect(hp.getAll('mainCost[]')).toEqual(['1', '2']);
    expect(hp.getAll('recallCost[]')).toEqual(['3']);
    expect(hp.get('effectSlot[0][trigger]')).toBe('17');
    expect(hp.has('effectSlot[0][condition]')).toBe(false);
    expect(hp.has('effectSlot[0][effect]')).toBe(false);
    expect(hp.get('effectSlot[1][effect]')).toBe('5');
    expect(hp.has('effectSlot[1][trigger]')).toBe(false);
    expect(hp.get('effectSlotMode')).toBe('and');
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

describe('toAbilityRefs', () => {
  it('translates symbol-only triggers, trims punctuation and drops placeholders/duplicates', () => {
    const refs = toAbilityRefs([
      { alteredId: 24, text: { fr: '{J}' } },
      { alteredId: 12, text: { fr: 'Lorsque je quitte la zone d’Expédition\u00a0' } },
      { alteredId: 23, text: { fr: '[]' } },
      { alteredId: 231, text: { fr: 'Lorsque je quitte la zone d’Expédition' } },
      { alteredId: 192, text: { fr: '{D}\u00a0:' } },
    ]);
    expect(refs.map((r) => r.text)).toEqual([
      'Défaussez-moi de la Réserve',
      'Joué de partout',
      'Lorsque je quitte la zone d’Expédition',
    ]);
    expect(refs.find((r) => r.text === 'Joué de partout')?.id).toBe(24);
  });

  it('labels the hand, reserve and anywhere triggers with their Altered glyph', () => {
    const refs = toAbilityRefs([
      { alteredId: 22, text: { fr: '{H}' } },
      { alteredId: 1, text: { fr: '{R}' } },
      { alteredId: 937, text: { fr: '{R}' } },
      { alteredId: 24, text: { fr: '{J}' } },
      { alteredId: 17, text: { fr: 'Au Crépuscule\u00a0' } },
    ]);
    expect(refs).toEqual([
      { id: 17, text: 'Au Crépuscule' },
      { id: 24, text: 'Joué de partout', glyph: '\ue026' },
      { id: 22, text: 'Joué depuis la Main', glyph: '\ue023' },
      { id: 1, text: 'Joué depuis la Réserve', glyph: '\ue024' },
    ]);
  });

  it('keeps the empty condition first as « Sans condition » when asked', () => {
    const rows = [
      { alteredId: 188, text: { fr: 'Si vous contrôlez un jeton\u00a0:' } },
      { alteredId: 191, text: { fr: '[]' } },
    ];
    expect(toAbilityRefs(rows, NO_CONDITION)).toEqual([
      { id: 191, text: 'Sans condition' },
      { id: 188, text: 'Si vous contrôlez un jeton' },
    ]);
    expect(toAbilityRefs(rows).map((r) => r.id)).toEqual([188]);
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
