import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import {
  CardCatalogService,
  NO_CONDITION,
  buildEffectsFilteredParams,
  buildLegacyCardsSearchParams,
  buildUnifiedSearchParams,
  effectMatchCounts,
  toAbilityRefs,
  toCard,
} from './card-catalog.service';
import type { Card, CardCollection, EffectFilterBlock } from './models';

const fx = (triggers: number[], conditions: number[], effects: number[]): EffectFilterBlock => ({ triggers, conditions, effects });

describe('buildUnifiedSearchParams & effectMatchCounts', () => {
  it('encodes pagination, sort, filters, stats, effects, and support into /api/v2/search params', () => {
    const hp = buildUnifiedSearchParams({
      page: 2,
      itemsPerPage: 36,
      q: 'kelon',
      effectText: 'piochez',
      factions: ['AX'],
      types: ['CHARACTER'],
      rarities: ['COMMON', 'UNIQUE'],
      sets: ['CORE'],
      variations: ['standard', 'kickstarter'],
      subtypes: ['ELEMENTAL'],
      mainCosts: { kind: 'values', values: [1, 2] },
      recallCosts: { kind: 'impossible' },
      format: 'frontier',
      order: 'name-asc',
      locale: 'fr',
      effects: [fx([22], [], [90]), fx([], [], [90])],
      support: fx([], [], [41]),
    });
    expect(hp.get('page')).toBe('2');
    expect(hp.get('limit')).toBe('36');
    expect(hp.get('sort')).toBe('name:fr_FR:asc');
    expect(hp.get('q')).toBe('kelon');
    expect(hp.get('effectText')).toBe('piochez');
    expect(hp.getAll('variation[]')).toEqual(['standard']);
    expect(hp.getAll('mainCost[]')).toEqual(['1', '2']);
    expect(hp.get('recallCost[gt]')).toBe('15');
    expect(hp.get('effect[0][t]')).toBe('22');
    expect(hp.get('effect[1][matchCount]')).toBe('2');
    expect(hp.get('effectMode')).toBe('and');
    expect(hp.get('support[o]')).toBe('41');
  });

  it('omits random sort and computes nested matchCounts capped at 3', () => {
    expect(buildUnifiedSearchParams({ order: 'random' }).has('sort')).toBe(false);
    expect(effectMatchCounts([fx([24], [], [90]), fx([], [], [90])])).toEqual([1, 2]);
    expect(effectMatchCounts([fx([], [], [90]), fx([], [], [90]), fx([], [], [90]), fx([], [], [90])])).toEqual([3, 3, 3, 3]);
  });

  it('builds /api/v2/effects/filtered params cleanly for both main and support slots', () => {
    const params = {
      factions: ['AX'],
      rarities: ['COMMON'],
      effects: [fx([22], [], [90]), fx([], [], [3])],
      support: fx([5], [], []),
    };
    const mainHp = buildEffectsFilteredParams(params, 0, fx([24], [], []), 'effects');
    expect(mainHp.get('editing')).toBe('output:1');
    expect(mainHp.get('effect[0][o]')).toBe('3');
    expect(mainHp.get('effect[1][t]')).toBe('24');
    expect(mainHp.get('support[t]')).toBe('5');

    const supHp = buildEffectsFilteredParams(params, 'support', fx([], [], [41]), 'triggers');
    expect(supHp.get('editing')).toBe('trigger:support');
    expect(supHp.get('support[o]')).toBe('41');
  });

  it('builds legacy /api/cards params cleanly for fallback mode', () => {
    const hp = buildLegacyCardsSearchParams({ factions: ['AX'], order: 'random', mainCosts: { kind: 'values', values: [2] } });
    expect(hp.get('faction.code')).toBe('AX');
    expect(hp.get('random')).toBe('true');
    expect(hp.getAll('mainCost[]')).toEqual(['2']);
  });
});

describe('toAbilityRefs & toCard', () => {
  it('sorts spellOnly outputs after non-spell outputs, merges duplicate labels via extraIds, and clears spellOnly when shared', () => {
    const refs = toAbilityRefs(
      [
        { alteredId: 10, text: { fr: 'Zebra spell' }, spellOnly: true },
        { alteredId: 20, text: { fr: 'Alpha spell' }, spellOnly: true },
        { alteredId: 30, text: { fr: 'Beta common' }, spellOnly: false },
        { alteredId: 31, text: { fr: 'Alpha spell' }, spellOnly: false },
        { alteredId: 99, text: { fr: '[]' } },
      ],
      NO_CONDITION,
    );
    expect(refs.map((r) => [r.text, !!r.spellOnly])).toEqual([
      [NO_CONDITION, false],
      ['Alpha spell', false],
      ['Beta common', false],
      ['Zebra spell', true],
    ]);
    expect(refs[1].extraIds).toEqual([31]);
  });

  it('maps CardV2 locales, expanded keywords, and legalFormats onto Card', () => {
    const card = toCard({
      reference: 'ALT_CORE_B_AX_04_U_1',
      name: { fr_FR: 'Élémentaire', en_US: 'Elemental' },
      mainEffect: { fr_FR: '[FLEETING] [DEFENDER_TKN_P]' },
      artist: 'Tarakanovich',
      legalFormats: ['standard', 'frontier'],
    });
    expect(card.name).toEqual({ fr: 'Élémentaire', en: 'Elemental' });
    expect(card.mainEffect).toEqual({ fr: '[Fugace] [Défenseurs]' });
    expect(card.artists).toEqual([{ name: 'Tarakanovich' }]);
    expect(card.gameplayFormat).toEqual(['STANDARD', 'FRONTIER']);
  });
});

describe('CardCatalogService', () => {
  let catalog: CardCatalogService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    catalog = TestBed.inject(CardCatalogService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('searches /api/v2/search, replays cached pages, and resolves exact ALT_ references via /api/v2/card/', () => {
    let first: CardCollection | undefined;
    let second: CardCollection | undefined;
    catalog.search({ factions: ['AX'], page: 1, itemsPerPage: 36 }).subscribe((r) => (first = r));
    const req = http.expectOne((r) => r.url === `${catalog.baseUrl}/api/v2/search`);
    req.flush({ iter: { total: 40 }, cards: [{ reference: 'ALT_CORE_B_AX_04_C', name: { fr_FR: 'Kelon' } }] });
    catalog.search({ factions: ['AX'], page: 1, itemsPerPage: 36 }).subscribe((r) => (second = r));
    expect(first?.totalItems).toBe(40);
    expect(first?.lastPage).toBe(2);
    expect(second).toEqual(first);

    let byRef: CardCollection | undefined;
    catalog.search({ q: 'ALT_CORE_B_AX_04_U_1', page: 1, itemsPerPage: 36 }).subscribe((r) => (byRef = r));
    http.expectOne(`${catalog.baseUrl}/api/v2/card/ALT_CORE_B_AX_04_U_1`).flush({ reference: 'ALT_CORE_B_AX_04_U_1' });
    expect(byRef?.member.map((c) => c.reference)).toEqual(['ALT_CORE_B_AX_04_U_1']);
  });

  it('hydrates batch via POST /api/v2/search and falls back to legacy /api/cards/batch only for missing refs', () => {
    let result: Card[] = [];
    catalog.batch(['ALT_CORE_B_AX_04_C', 'ALT_MISSING_01_C'], 'fr').subscribe((c) => (result = c));
    const v2 = http.expectOne((r) => r.method === 'POST' && r.url === `${catalog.baseUrl}/api/v2/search`);
    v2.flush({ cards: [{ reference: 'ALT_CORE_B_AX_04_C', name: { fr_FR: 'Kelon' } }] });
    const legacy = http.expectOne((r) => r.method === 'POST' && r.url === `${catalog.legacyBaseUrl}/api/cards/batch`);
    expect(legacy.request.body).toEqual({ references: ['ALT_MISSING_01_C'] });
    legacy.flush([{ reference: 'ALT_MISSING_01_C', name: 'Missing' }]);
    expect(result.map((c) => c.reference)).toEqual(['ALT_CORE_B_AX_04_C', 'ALT_MISSING_01_C']);
  });

  it('caches uniqueFaces per session', () => {
    const bareUnique: Card = { reference: 'ALT_EOLE_B_YZ_111_U_1', rarity: { reference: 'UNIQUE' } };
    let first: Map<string, Card> | undefined;
    catalog.uniqueFaces([bareUnique]).subscribe((m) => (first = m));
    http.expectOne((r) => r.method === 'POST' && r.url === `${catalog.baseUrl}/api/v2/search`).flush({
      cards: [{ reference: 'ALT_EOLE_B_YZ_111_U_1', mainEffect: { fr_FR: '{H} Piochez.' } }],
    });
    expect(first?.get('ALT_EOLE_B_YZ_111_U_1')?.mainEffect).toEqual({ fr: '{H} Piochez.' });

    let second: Map<string, Card> | undefined;
    catalog.uniqueFaces([bareUnique]).subscribe((m) => (second = m));
    expect(second?.get('ALT_EOLE_B_YZ_111_U_1')?.mainEffect).toEqual({ fr: '{H} Piochez.' });
  });

  it('falls back to legacy /api/cards when uniquesApiUrl is unconfigured', () => {
    const env = environment as { uniquesApiUrl: string };
    const saved = env.uniquesApiUrl;
    env.uniquesApiUrl = '';
    try {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
      const legacyCatalog = TestBed.inject(CardCatalogService);
      const legacyHttp = TestBed.inject(HttpTestingController);
      expect(legacyCatalog.supportsUnified).toBe(false);

      let col: CardCollection | undefined;
      legacyCatalog.search({ factions: ['AX'] }).subscribe((r) => (col = r));
      legacyHttp.expectOne((r) => r.url === `${legacyCatalog.legacyBaseUrl}/api/cards`).flush({ member: [{ reference: 'ALT_1' }], totalItems: 1 });
      expect(col?.member[0].reference).toBe('ALT_1');
      legacyHttp.verify();
    } finally {
      env.uniquesApiUrl = saved;
    }
  });
});
