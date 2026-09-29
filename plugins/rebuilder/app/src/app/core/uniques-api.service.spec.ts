import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { lastValueFrom } from 'rxjs';
import { NO_CONDITION, UniquesApiService, effectMatchCounts, toAbilityRefs, toCard, type UniquesEffect, type UniquesQuery } from './uniques-api.service';

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

