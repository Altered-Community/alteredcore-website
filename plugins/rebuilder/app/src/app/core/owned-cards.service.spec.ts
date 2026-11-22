import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { lastValueFrom } from 'rxjs';
import { defaultFilters, legalFormat } from './card-filters';
import type { FormatRules } from './format-rules';
import { OwnedCardsService, listedRarities, ownedParams } from './owned-cards.service';

const rules = (unique: number | null): FormatRules => ({
  code: unique === 0 ? 'nuc' : 'standard',
  label: '',
  minCards: 39,
  maxCards: 59,
  allowBanned: false,
  allowSuspended: false,
  limits: { unique, rare: 15, exalted: 3, maxCopiesPerName: 3, maxCopiesPerRarity: null },
});
const standard = rules(3);
const nuc = rules(0);

const ACCOUNT_TABS = ['favorites', 'collection', 'owned'] as const;

describe('Account tabs rarities', () => {
  it('lists the Uniques by default and sends no rarity filter when every rarity is chosen', () => {
    for (const source of ACCOUNT_TABS) {
      const f = defaultFilters(source);
      expect(f.rarities).toEqual(['COMMON', 'RARE', 'EXALTED', 'UNIQUE']);
      expect(ownedParams(source, f, ['AX'], 1, 36, standard).getAll('rarity[]')).toBeNull();
      expect(f.sets).toContain('COREKS');
    }
    expect(defaultFilters('all').sets).not.toContain('COREKS');
  });

  it('sends the chosen rarities, Uniques included', () => {
    const f = { ...defaultFilters('owned'), rarities: ['RARE', 'UNIQUE'] };
    expect(ownedParams('owned', f, ['AX'], 1, 36).getAll('rarity[]')).toEqual(['RARE', 'UNIQUE']);
  });

  it('leaves the Uniques out in a No Unique format while « légales » is on', () => {
    expect(legalFormat('all', defaultFilters('all'), 'nuc')).toBeNull();
    for (const source of ACCOUNT_TABS) {
      const f = defaultFilters(source);
      expect(listedRarities(source, f, nuc)).toEqual(['COMMON', 'RARE', 'EXALTED']);
      expect(ownedParams(source, f, ['AX'], 1, 36, nuc).getAll('rarity[]')).toEqual(['COMMON', 'RARE', 'EXALTED']);
      expect(legalFormat(source, f, 'nuc')).toBe('nuc');
      expect(legalFormat(source, { ...f, legalOnly: false }, 'nuc')).toBeNull();
      expect(listedRarities(source, { ...f, rarities: ['UNIQUE'] }, nuc)).toEqual([]);
    }
  });
});

describe('Collection and digital ownership query', () => {
  it('sends every value of a list filter in the array form', () => {
    for (const source of ['collection', 'owned'] as const) {
      const p = ownedParams(source, { ...defaultFilters(source), rarities: ['COMMON', 'RARE'] }, ['AX', 'BR'], 1, 36);
      expect(p.getAll('rarity[]')).toEqual(['COMMON', 'RARE']);
      expect(p.getAll('faction[]')).toEqual(['AX', 'BR']);
      expect(p.getAll('cardType[]')?.length).toBe(4);
      expect(p.getAll('cardSet[]')).toEqual(defaultFilters(source).sets);
      expect(p.has('rarity')).toBe(false);
    }
  });
  it('sends contiguous ranges, disjoint lists, recall costs and powers to both collection and ownership proxies', () => {
    for (const source of ['collection', 'owned'] as const) {
      const p = ownedParams(
        source,
        { ...defaultFilters(source), mainCost: '1-3', recallCost: '1, 4', forestPower: '1-2, 5', mountainPower: '3', oceanPower: '<2' },
        ['AX'],
        1,
        36,
      );
      expect(p.get('mainCost[gte]')).toBe('1');
      expect(p.get('mainCost[lte]')).toBe('3');
      expect(p.getAll('recallCost[]')).toEqual(['1', '4']);
      expect(p.getAll('forestPower[]')).toEqual(['1', '2', '5']);
      expect(p.get('mountainPower[gte]')).toBe('3');
      expect(p.get('mountainPower[lte]')).toBe('3');
      expect(p.get('oceanPower[gte]')).toBe('0');
      expect(p.get('oceanPower[lte]')).toBe('1');
    }
  });

  it('sends variation[] and promoSets on owned when altArts toggles, and omits them on collection', () => {
    const ownedDefault = ownedParams('owned', defaultFilters('owned'), ['AX'], 1, 36);
    expect(ownedDefault.getAll('variation[]')).toEqual(['standard']);
    expect(ownedDefault.getAll('cardSet[]')).not.toContain('WCF25');

    const ownedAlt = ownedParams('owned', { ...defaultFilters('owned'), altArts: 'with' as const, promoSets: ['WCF25'] }, ['AX'], 1, 36);
    expect(ownedAlt.getAll('variation[]')).toEqual(['standard', 'alt-art', 'promo', 'kickstarter', 'serialized']);
    expect(ownedAlt.getAll('cardSet[]')).toContain('WCF25');

    const ownedOnly = ownedParams('owned', { ...defaultFilters('owned'), altArts: 'only' as const, promoSets: ['WCF25'] }, ['AX'], 1, 36);
    expect(ownedOnly.getAll('variation[]')).toEqual(['alt-art', 'promo']);
    expect(ownedOnly.getAll('cardSet[]')).toContain('WCF25');

    const collAlt = ownedParams('collection', { ...defaultFilters('collection'), altArts: 'with' as const, promoSets: ['WCF25'] }, ['AX'], 1, 36);
    expect(collAlt.getAll('variation[]')).toBeNull();
    expect(collAlt.getAll('cardSet[]')).not.toContain('WCF25');
  });

  it('sends [gt]=15 instead of dropping valid out-of-range numeric filters', () => {
    const p = ownedParams(
      'owned',
      { ...defaultFilters('owned'), mainCost: '20', recallCost: '<0', forestPower: '>15' },
      ['AX'],
      1,
      36,
    );
    expect(p.get('mainCost[gt]')).toBe('15');
    expect(p.get('recallCost[gt]')).toBe('15');
    expect(p.get('forestPower[gt]')).toBe('15');
  });
});

describe('OwnedCardsService', () => {
  let http: HttpTestingController;
  let service: OwnedCardsService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(OwnedCardsService);
  });
  afterEach(() => http.verify());

  const unique = { reference: 'ALT_ALIZE_B_BR_35_U_15855', quantity: 1, rarity: 'UNIQUE', mainCost: 2, recallCost: 3, forest: 1, mountain: 3, ocean: 0 };
  const common = { cardReference: 'ALT_CORE_B_AX_08_C', quantity: 3, rarity: 'COMMON' };
  const search = (source: 'collection' | 'owned', member: object[]) => {
    const page = lastValueFrom(service.search(source, defaultFilters(source), [], 1, 36));
    http.expectOne((r) => r.url.endsWith(`/${source === 'owned' ? 'ownership' : 'collection'}-search`)).flush({ member, totalItems: member.length, lastPage: 1 });
    return page;
  };

  it('fills the effects of the Uniques owned from unified search first, once a session', async () => {
    const page = search('owned', [unique, common]);
    const unified = http.expectOne((r) => r.url.endsWith('/api/v2/search') && r.method === 'POST');
    expect(String(unified.request.body)).toContain(`ref[]=${unique.reference}`);
    unified.flush({
      cards: [{ reference: unique.reference, mainEffect: { fr_FR: 'Quand je suis joué…' }, forestPower: 1, mountainPower: 3, oceanPower: 0 }],
    });
    const [owned, other] = (await page).member;
    expect(owned).toEqual(expect.objectContaining({ mainEffect: { fr: 'Quand je suis joué…' }, forestPower: 1, mountainPower: 3, oceanPower: 0, quantity: 1 }));
    expect(other.reference).toBe(common.cardReference);
    // Same Unique again (another page, back on the tab): no second call.
    expect((await search('owned', [unique])).member[0].mainEffect).toEqual({ fr: 'Quand je suis joué…' });
  });

  it('keeps the powers of the ownership API when both unified search and cards API fail', async () => {
    const page = search('owned', [unique]);
    http.expectOne((r) => r.url.endsWith('/api/v2/search') && r.method === 'POST').flush('down', { status: 502, statusText: 'Bad Gateway' });
    http.expectOne((r) => r.url.endsWith('/api/cards/batch')).flush('down', { status: 502, statusText: 'Bad Gateway' });
    expect((await page).member[0]).toEqual(expect.objectContaining({ forestPower: 1, mountainPower: 3, oceanPower: 0 }));
  });

  it('falls back to /api/cards/batch then /api/v2/cards when unified search fails and batch omits a Unique', async () => {
    const page = search('owned', [unique]);
    http.expectOne((r) => r.url.endsWith('/api/v2/search') && r.method === 'POST').flush('down', { status: 404, statusText: 'Not Found' });
    http.expectOne((r) => r.url.endsWith('/api/cards/batch')).flush([]);
    const v2 = http.expectOne((r) => r.url.endsWith('/api/v2/cards') && r.params.getAll('ref[]')?.[0] === unique.reference);
    v2.flush({ cards: [{ reference: unique.reference, mainEffect: { fr_FR: 'Effet v2' }, forestPower: 1, mountainPower: 3, oceanPower: 0 }] });
    expect((await page).member[0].mainEffect).toEqual({ fr: 'Effet v2' });
  });

  it('asks the cards API nothing without a Unique', async () => {
    expect((await search('collection', [common])).member.length).toBe(1);
  });
});
