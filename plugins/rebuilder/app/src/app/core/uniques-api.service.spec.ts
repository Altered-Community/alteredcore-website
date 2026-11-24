import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { lastValueFrom } from 'rxjs';
import { NO_CONDITION, UniquesApiService, buildEffectsFilteredParams, buildUniquesParams, buildUnifiedSearchParams, effectMatchCounts, toAbilityRefs, toCard, type UniquesEffect, type UniquesQuery } from './uniques-api.service';

const QUERY: UniquesQuery = { factions: ['AX'], sets: [], mainCosts: [], recallCosts: [], effects: [] };

const KELON = {
  reference: 'ALT_COREKS_B_AX_04_U_1',
  name: { en_US: 'Kelon Elemental', fr_FR: 'Élémentaire de Kélon' },
  artist: 'Zero Wen',
  set: { reference: 'COREKS', name: 'Beyond the Gates - KS Edition', code: 'BTG' },
  cardSubTypes: [{ reference: 'ELEMENTAL', name: { en_US: 'Elemental', fr_FR: 'Élémentaire' } }],
  mainCost: 2,
  recallCost: 2,
  forestPower: 2,
  mountainPower: 1,
  oceanPower: 0,
  faction: { code: 'AX', name: 'Axiom' },
  mainEffect: { en_US: '{R} You may…', fr_FR: '{R} Vous pouvez…' },
  echoEffect: {},
};

describe('effectMatchCounts', () => {
  const fx = (triggers: number[], conditions: number[], effects: number[]): UniquesEffect => ({ triggers, conditions, effects });

  it('asks a block for one more ability per block it covers, so one ability does not answer two blocks', () => {
    // « Quand {H} ou {J} · Sans condition · Alors Piochez » and « Alors Piochez »: the second covers the first.
    expect(effectMatchCounts([fx([22, 24], [191], [90]), fx([], [], [90])])).toEqual([1, 2]);
    // Two identical blocks: two abilities each.
    expect(effectMatchCounts([fx([], [], [90]), fx([], [], [90])])).toEqual([2, 2]);
    // A chain: « Piochez » covers « {J} · Piochez », which covers « {J} · Sans condition · Piochez ».
    expect(effectMatchCounts([fx([24], [191], [90]), fx([24], [], [90]), fx([], [], [90])])).toEqual([1, 2, 3]);
  });

  it('leaves unrelated or overlapping blocks at one ability, and caps at the API maximum of 3', () => {
    expect(effectMatchCounts([fx([22], [], []), fx([], [], [90])])).toEqual([1, 1]);
    // {H} or {J} does not cover {H} or {R}: a {R} ability matches the second one only.
    expect(effectMatchCounts([fx([22, 24], [], []), fx([22, 1], [], [])])).toEqual([1, 1]);
    expect(effectMatchCounts([fx([], [], [90]), fx([], [], [90]), fx([], [], [90]), fx([], [], [90])])).toEqual([3, 3, 3, 3]);
  });
});

describe('buildEffectsFilteredParams', () => {
  const fx = (triggers: number[], conditions: number[], effects: number[]): UniquesEffect => ({ triggers, conditions, effects });
  const params = (query: UniquesQuery, index: number | 'support', block: UniquesEffect, kind: 'triggers' | 'conditions' | 'effects') => {
    const hp = buildEffectsFilteredParams(query, index, block, kind);
    return Object.fromEntries(hp.keys().map((k) => [k, hp.getAll(k)!.join('|')]));
  };

  it('narrows the support effect on the support line, the main effects kept as searched', () => {
    const query: UniquesQuery = { ...QUERY, effects: [fx([22], [], []), fx([], [], [])], support: fx([1], [], []) };
    expect(params(query, 'support', fx([432], [], [90]), 'conditions')).toEqual({
      'faction[]': 'AX',
      'effect[0][t]': '22',
      'support[t]': '432',
      'support[o]': '90',
      editing: 'condition:support',
    });
  });

  it('keeps the support effect as a constraint while a main effect is edited', () => {
    const query: UniquesQuery = { ...QUERY, effects: [fx([], [], [])], support: fx([], [], [90]) };
    expect(params(query, 0, fx([22], [], []), 'effects')).toMatchObject({ 'effect[0][t]': '22', 'support[o]': '90', editing: 'output:0' });
  });

  it('sends support[t|c|o] to /api/v2/cards, and nothing for an empty support effect', () => {
    const hp = buildUniquesParams({ ...QUERY, support: fx([432], [191], []) }, null, 36);
    expect(hp.get('support[t]')).toBe('432');
    expect(hp.get('support[c]')).toBe('191');
    expect(hp.has('support[o]')).toBe(false);
    expect(buildUniquesParams({ ...QUERY, support: fx([], [], []) }, null, 36).keys().some((k) => k.startsWith('support'))).toBe(false);
  });

  it('sends the other criteria and puts the edited block last, in the slot `editing` names', () => {
    const query: UniquesQuery = { ...QUERY, name: 'kelon', sets: ['CORE'], mainCosts: [3], format: 'frontier', effects: [fx([22], [], []), fx([], [], [90])] };
    expect(params(query, 0, fx([22, 24], [], []), 'conditions')).toEqual({
      name: 'kelon',
      'faction[]': 'AX',
      'set[]': 'CORE',
      'mainCost[]': '3',
      format: 'frontier',
      'effect[0][o]': '90',
      'effect[1][t]': '22,24',
      effectMode: 'and',
      editing: 'condition:1',
    });
  });

  it('numbers the slot from the blocks actually sent: empty blocks and the edited one do not shift it', () => {
    // The first block is empty and the edited one is in the middle: the legacy search sent `editing=…:2` for slot 1.
    const query: UniquesQuery = { ...QUERY, effects: [fx([], [], []), fx([], [], [90]), fx([24], [], []), fx([1], [], [])] };
    expect(params(query, 2, fx([24], [], []), 'triggers')).toEqual({
      'faction[]': 'AX',
      'effect[0][o]': '90',
      'effect[1][t]': '1',
      'effect[2][t]': '24',
      effectMode: 'and',
      editing: 'trigger:2',
    });
  });

  it('reads the edited block from what is picked, not from the search, and names an empty one too', () => {
    const query: UniquesQuery = { ...QUERY, effects: [fx([], [], [90])] };
    expect(params(query, 0, fx([], [], []), 'effects')).toEqual({ 'faction[]': 'AX', editing: 'output:0' });
    expect(params(query, 0, fx([], [191], []), 'effects')).toEqual({ 'faction[]': 'AX', 'effect[0][c]': '191', editing: 'output:0' });
  });

  it('keeps the matchCount the other blocks have among themselves, and none on the edited one', () => {
    // Searched, the first « Piochez » would cover the edited « {J} · Piochez » and need 3 abilities;
    // with « Ravitaillez » picked instead it needs 2. Narrowing asks for 2, so « Ravitaillez » stays offered.
    const query: UniquesQuery = { ...QUERY, effects: [fx([], [], [90]), fx([], [], [90]), fx([24], [], [90])] };
    expect(params(query, 2, fx([24], [], [90]), 'effects')).toEqual({
      'faction[]': 'AX',
      'effect[0][o]': '90',
      'effect[0][matchCount]': '2',
      'effect[1][o]': '90',
      'effect[1][matchCount]': '2',
      'effect[2][t]': '24',
      'effect[2][o]': '90',
      effectMode: 'and',
      editing: 'output:2',
    });
  });
});

describe('toCard', () => {
  it('maps a CardV2 to the app card: locale keys fr / en, a Unique Character, the artist', () => {
    const card = toCard(KELON);
    expect(card.name).toEqual({ en: 'Kelon Elemental', fr: 'Élémentaire de Kélon' });
    expect(card.rarity).toEqual({ reference: 'UNIQUE' });
    expect(card.cardType?.reference).toBe('CHARACTER');
    expect(card.cardSubTypes).toEqual([{ reference: 'ELEMENTAL', name: { en: 'Elemental', fr: 'Élémentaire' } }]);
    expect(card.mainEffect).toEqual({ en: '{R} You may…', fr: '{R} Vous pouvez…' });
    expect(card.echoEffect).toBeNull();
    expect(card.artists).toEqual([{ name: 'Zero Wen' }]);
    expect(card.set).toEqual({ reference: 'COREKS', name: 'Beyond the Gates - KS Edition', code: 'BTG' });
    expect([card.mainCost, card.recallCost, card.forestPower, card.mountainPower, card.oceanPower]).toEqual([2, 2, 2, 1, 0]);
  });
});

describe('UniquesApiService', () => {
  let api: UniquesApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(UniquesApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pages with the cursor of the previous response, and ends when there is none', async () => {
    const first = lastValueFrom(api.search(QUERY, null, 36));
    const req = http.expectOne((r) => r.url.endsWith('/api/v2/cards'));
    expect(req.request.params.has('cursor')).toBe(false);
    req.flush({ iter: { total: 2, cursor: 41 }, cards: [KELON] });
    expect(await first).toMatchObject({ totalItems: 2, next: 41, member: [{ reference: KELON.reference }] });

    const last = lastValueFrom(api.search(QUERY, 41, 36));
    const next = http.expectOne((r) => r.url.endsWith('/api/v2/cards'));
    expect(next.request.params.get('cursor')).toBe('41');
    next.flush({ iter: { total: 2 }, cards: [{ ...KELON, reference: 'ALT_COREKS_B_AX_04_U_2' }] });
    expect((await last).next).toBeNull();
  });

  it('replays a page already fetched', async () => {
    const a = lastValueFrom(api.search(QUERY, null, 36));
    http.expectOne((r) => r.url.endsWith('/api/v2/cards')).flush({ iter: { total: 1 }, cards: [KELON] });
    await a;
    expect((await lastValueFrom(api.search(QUERY, null, 36))).totalItems).toBe(1);
    http.expectNone((r) => r.url.endsWith('/api/v2/cards'));
  });

  it('looks an exact reference up, and reads an unknown one as no result', async () => {
    const found = lastValueFrom(api.search({ ...QUERY, reference: 'ALT_COREKS_B_AX_04_U_1' }, null, 36));
    http.expectOne((r) => r.url.endsWith('/api/v2/card/ALT_COREKS_B_AX_04_U_1')).flush(KELON);
    expect((await found).member.map((c) => c.reference)).toEqual([KELON.reference]);

    const missing = lastValueFrom(api.search({ ...QUERY, reference: 'ALT_COREKS_B_AX_99_U_1' }, null, 36));
    http.expectOne((r) => r.url.endsWith('/api/v2/card/ALT_COREKS_B_AX_99_U_1')).flush({}, { status: 404, statusText: 'Not Found' });
    expect(await missing).toEqual({ member: [], totalItems: 0, next: null });
  });

  it('looks an exact reference up in the format (Frontier) list: a Unique off the list is no result', async () => {
    const off = lastValueFrom(api.search({ ...QUERY, reference: 'ALT_EOLE_B_AX_122_U_5274', format: 'frontier_s05' }, null, 36));
    const req = http.expectOne((r) => r.url.endsWith('/api/v2/cards'));
    expect(req.request.params.get('ref')).toBe('ALT_EOLE_B_AX_122_U_5274');
    expect(req.request.params.get('format')).toBe('frontier_s05');
    req.flush({ iter: { total: 0 }, cards: [] });
    expect(await off).toEqual({ member: [], totalItems: 0, next: null });

    const on = lastValueFrom(api.search({ ...QUERY, reference: KELON.reference, format: 'frontier_s05' }, null, 36));
    http.expectOne((r) => r.url.endsWith('/api/v2/cards')).flush({ iter: { total: 1 }, cards: [KELON] });
    expect((await on).member.map((c) => c.reference)).toEqual([KELON.reference]);
  });

  it('maps single-field sort to `sort=` and omits random', async () => {
    const sorted = lastValueFrom(api.search({ ...QUERY, order: 'mainCost-desc' }, null, 36));
    const req = http.expectOne((r) => r.url.endsWith('/api/v2/cards'));
    expect(req.request.params.get('sort')).toBe('mainCost:desc');
    req.flush({ iter: { total: 1 }, cards: [KELON] });
    await sorted;

    const rnd = lastValueFrom(api.search({ ...QUERY, order: 'random' }, null, 36));
    const rndReq = http.expectOne((r) => r.url.endsWith('/api/v2/cards'));
    expect(rndReq.request.params.has('sort')).toBe(false);
    rndReq.flush({ iter: { total: 1 }, cards: [KELON] });
    await rnd;
  });

  it('builds the effect vocabularies from one /api/v2/effects call, main-effect entries only', async () => {
    const triggers = lastValueFrom(api.abilities('triggers'));
    const conditions = lastValueFrom(api.abilities('conditions'));
    const effects = lastValueFrom(api.abilities('effects'));
    http.expectOne((r) => r.url.endsWith('/api/v2/effects')).flush({
      triggers: [
        { idGd: 22, text: { fr_FR: '{H}' }, isMain: true },
        { idGd: 432, text: { fr_FR: 'Lorsque vous jouez un Sort\u00a0—' }, isMain: false, isEcho: true },
      ],
      conditions: [{ idGd: 191, text: { fr_FR: '[]' }, isMain: true }],
      output: [{ idGd: 90, text: { fr_FR: 'Piochez une carte.' }, isMain: true }],
    });
    expect(await triggers).toEqual([{ id: 22, text: 'Joué depuis la Main', glyph: '' }]);
    expect(await conditions).toEqual([{ id: 191, text: NO_CONDITION }]);
    expect(await effects).toEqual([{ id: 90, text: 'Piochez une carte.' }]);
  });

  it('builds the support effect vocabularies from the entries of the support line (isEcho)', async () => {
    const triggers = lastValueFrom(api.abilities('triggers', true));
    http.expectOne((r) => r.url.endsWith('/api/v2/effects')).flush({
      triggers: [
        { idGd: 22, text: { fr_FR: '{H}' }, isMain: true },
        { idGd: 432, text: { fr_FR: 'Lorsque vous jouez un Sort' }, isMain: false, isEcho: true },
      ],
    });
    expect((await triggers).map((t) => t.id)).toEqual([432]);
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

  it('prints the symbols and keywords as the card does, without the trigger’s trailing dash', () => {
    const refs = toAbilityRefs([
      { alteredId: 1, text: { fr: 'Lorsqu’une capacité {D} est activée pendant votre tour —' } },
      { alteredId: 2, text: { fr: 'Lorsqu’un Personnage que vous contrôlez gagne [Fugace] —' } },
      { alteredId: 3, text: { fr: 'Lorsqu’une carte quitte votre Réserve —' } },
    ]);
    const [d, fleeting, plain] = [1, 2, 3].map((id) => refs.find((r) => r.id === id)!);
    expect(d.text).toBe('Lorsqu’une capacité Défaussez-moi de la Réserve est activée pendant votre tour');
    expect(d.rich?.find((p) => 'glyph' in p)).toMatchObject({ glyph: '' });
    expect(fleeting.text).toBe('Lorsqu’un Personnage que vous contrôlez gagne Fugace');
    expect(fleeting.rich).toContainEqual({ text: 'Fugace', bold: true });
    expect(plain).toEqual({ id: 3, text: 'Lorsqu’une carte quitte votre Réserve' });
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

describe('buildEffectsFilteredParams', () => {
  it('forwards subtypes, costRelation and hasNoEffect alongside other effect filters', () => {
    const hp = buildEffectsFilteredParams(
      {
        factions: ['AX'],
        sets: ['CORE'],
        subtypes: ['ELEMENTAL'],
        costRelation: 'recallHigher',
        noEffect: false,
        mainCosts: [],
        recallCosts: [],
        effects: [],
      },
      0,
      { triggers: [24], conditions: [], effects: [] },
      'effects',
    );
    expect(hp.getAll('subTypes[]')).toEqual(['ELEMENTAL']);
    expect(hp.get('costRelation')).toBe('recallHigher');
    expect(hp.has('hasNoEffect')).toBe(false);
  });
});

describe('unified /api/v2/search', () => {
  let api: UniquesApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(UniquesApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('builds /api/v2/search params with localized name sort, variations excluding kickstarter, and >15 stats', () => {
    const hp = buildUnifiedSearchParams({
      page: 2,
      itemsPerPage: 36,
      locale: 'fr',
      q: 'sierra',
      factions: ['AX'],
      types: ['HERO', 'CHARACTER'],
      rarities: ['COMMON', 'RARE'],
      sets: ['CORE', 'FUGUE'],
      variations: ['standard', 'alt-art', 'kickstarter'],
      mainCosts: [16],
      subtypes: ['ENGINEER'],
      costRelation: 'mainHigher',
      hasNoEffect: true,
      order: 'name-asc',
    });
    expect(hp.get('page')).toBe('2');
    expect(hp.get('limit')).toBe('36');
    expect(hp.get('sort')).toBe('name:fr_FR:asc');
    expect(hp.get('name')).toBe('sierra');
    expect(hp.getAll('faction[]')).toEqual(['AX']);
    expect(hp.getAll('cardType[]')).toEqual(['HERO', 'CHARACTER']);
    expect(hp.getAll('rarity[]')).toEqual(['COMMON', 'RARE']);
    expect(hp.getAll('set[]')).toEqual(['CORE', 'FUGUE']);
    expect(hp.getAll('variation[]')).toEqual(['standard', 'alt-art']);
    expect(hp.get('mainCost[gt]')).toBe('15');
    expect(hp.getAll('subTypes[]')).toEqual(['ENGINEER']);
    expect(hp.get('costRelation')).toBe('mainHigher');
    expect(hp.get('hasNoEffect')).toBe('true');
  });

  it('queries /api/v2/search, maps rich non-unique CardV2 metadata, and caches pages', async () => {
    const p1 = lastValueFrom(api.searchUnified({ page: 1, itemsPerPage: 36, order: 'mainCost-asc', rarities: ['COMMON'] }));
    const req = http.expectOne((r) => r.url.endsWith('/api/v2/search'));
    expect(req.request.params.get('sort')).toBe('mainCost:asc');
    req.flush({
      iter: { total: 40, page: 1 },
      cards: [
        {
          kind: 'nonunique',
          reference: 'ALT_CORE_B_AX_01_C',
          name: { fr_FR: 'Sierra & Oddball', en_US: 'Sierra & Oddball' },
          cardType: { reference: 'HERO', name: { fr_FR: 'Héros', en_US: 'Hero' } },
          rarity: { reference: 'COMMON', name: 'Common' },
          faction: { code: 'AX', name: 'Axiom' },
          mainCost: null,
          recallCost: null,
          forestPower: null,
          mountainPower: null,
          oceanPower: null,
        },
      ],
    });
    const res = await p1;
    expect(res.totalItems).toBe(40);
    expect(res.lastPage).toBe(2);
    expect(res.member[0].rarity?.reference).toBe('COMMON');
    expect(res.member[0].cardType?.reference).toBe('HERO');
    expect(res.member[0].mainCost).toBeNull();

    await lastValueFrom(api.searchUnified({ page: 1, itemsPerPage: 36, order: 'mainCost-asc', rarities: ['COMMON'] }));
    http.expectNone((r) => r.url.endsWith('/api/v2/search'));
  });

  it('maps nullable stats and status flags cleanly in toCard', () => {
    const card = toCard({
      reference: 'ALT_CORE_B_AX_01_C',
      cardType: { reference: 'SPELL', name: { fr_FR: 'Sort' } },
      rarity: { reference: 'RARE' },
      isBanned: true,
    });
    expect(card.rarity).toEqual({ reference: 'RARE' });
    expect(card.cardType).toEqual({ reference: 'SPELL', name: { fr: 'Sort' } });
    expect(card.isBanned).toBe(true);
  });

  it('sends the card text as effectText to the unified search', () => {
    const params = buildUnifiedSearchParams({ page: 1, itemsPerPage: 36, effectText: ' piochez ', variations: ['alt-art'] });
    expect(params.get('effectText')).toBe('piochez');
    expect(params.getAll('variation[]')).toEqual(['alt-art']);
    expect(buildUnifiedSearchParams({ page: 1, effectText: '  ' }).has('effectText')).toBe(false);
  });

  it('maps number-desc to reference:desc in buildUnifiedSearchParams', () => {
    const params = buildUnifiedSearchParams({
      order: 'number-desc',
      page: 1,
      itemsPerPage: 36,
      locale: 'fr',
    });
    expect(params.get('sort')).toBe('reference:desc');
  });

  it('fetches Uniques by references in chunks of 50 via /api/v2/cards', async () => {
    const refs = Array.from({ length: 52 }, (_, i) => `ALT_CORE_B_AX_04_U_${i + 1}`);
    const pending = lastValueFrom(api.byReferences(refs));

    const first = http.expectOne((r) => r.url.endsWith('/api/v2/cards') && r.params.getAll('ref[]')?.length === 50);
    expect(first.request.params.get('limit')).toBe('50');
    first.flush({
      cards: [{ reference: refs[0], name: 'U1', mainCost: 2, recallCost: 2, rarity: { reference: 'UNIQUE' } }],
    });

    const second = http.expectOne((r) => r.url.endsWith('/api/v2/cards') && r.params.getAll('ref[]')?.length === 2);
    expect(second.request.params.get('limit')).toBe('2');
    second.flush({
      cards: [{ reference: refs[51], name: 'U52', mainCost: 4, recallCost: 3, rarity: { reference: 'UNIQUE' } }],
    });

    const cards = await pending;
    expect(cards.map((c) => c.reference)).toEqual([refs[0], refs[51]]);
    expect(cards[0].mainCost).toBe(2);
  });

  it('batches both uniques and non-uniques via POST /api/v2/search in chunks of 200', async () => {
    const refs = Array.from({ length: 201 }, (_, i) => (i === 200 ? 'ALT_CORE_B_AX_04_U_1' : `ALT_CORE_B_AX_04_C_${i}`));
    const pending = lastValueFrom(api.searchBatch(refs));

    const first = http.expectOne((r) => r.url.endsWith('/api/v2/search') && r.method === 'POST' && String(r.body).includes('limit=200'));
    first.flush({ cards: [{ reference: refs[0], rarity: { reference: 'COMMON' } }] });

    const second = http.expectOne((r) => r.url.endsWith('/api/v2/search') && r.method === 'POST' && String(r.body).includes('limit=1'));
    second.flush({ cards: [{ reference: refs[200], rarity: { reference: 'UNIQUE' }, isBanned: true }] });

    const cards = await pending;
    expect(cards.map((c) => c.reference)).toEqual([refs[0], refs[200]]);
    expect(cards[1].isBanned).toBe(true);
  });

  it('marks COREKS hero prints as kickstarter in heroVariation so CORE stays standard', () => {
    const res = toCard({
      reference: 'ALT_COREKS_B_AX_01_C',
      set: { reference: 'COREKS', name: 'Beyond the Gates - KS Edition', code: 'BTG' },
      product: 'B',
      isSerialized: false,
      cardType: { reference: 'HERO' },
    });
    expect(res.set?.reference).toBe('COREKS');
  });
});

