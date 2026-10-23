import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { lastValueFrom } from 'rxjs';
import { defaultFilters, legalFormat } from './card-filters';
import { OwnedCardsService, listedRarities, ownedParams } from './owned-cards.service';

const ACCOUNT_TABS = ['favorites', 'collection', 'owned'] as const;

describe('Account tabs rarities', () => {
  it('lists the Uniques by default and sends no rarity filter when every rarity is chosen', () => {
    for (const source of ACCOUNT_TABS) {
      const f = defaultFilters(source);
      expect(f.rarities).toEqual(['COMMON', 'RARE', 'EXALTED', 'UNIQUE']);
      expect(ownedParams(source, f, ['AX'], 1, 36, 'standard').getAll('rarity[]')).toBeNull();
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
      expect(listedRarities(source, f, 'nuc')).toEqual(['COMMON', 'RARE', 'EXALTED']);
      expect(ownedParams(source, f, ['AX'], 1, 36, 'nuc').getAll('rarity[]')).toEqual(['COMMON', 'RARE', 'EXALTED']);
      expect(legalFormat(source, f, 'nuc')).toBe('nuc');
      expect(legalFormat(source, { ...f, legalOnly: false }, 'nuc')).toBeNull();
      expect(listedRarities(source, { ...f, rarities: ['UNIQUE'] }, 'nuc')).toEqual([]);
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

  it('fills the effects of the Uniques owned from the cards API, once a session', async () => {
    const page = search('owned', [unique, common]);
    const batch = http.expectOne((r) => r.url.endsWith('/api/cards/batch'));
    expect(batch.request.body).toEqual({ references: [unique.reference] });
    batch.flush([{ reference: unique.reference, mainEffect: 'Quand je suis joué…', forestPower: 1, mountainPower: 3, oceanPower: 0 }]);
    const [owned, other] = (await page).member;
    expect(owned).toEqual(expect.objectContaining({ mainEffect: 'Quand je suis joué…', forestPower: 1, mountainPower: 3, oceanPower: 0, quantity: 1 }));
    expect(other.reference).toBe(common.cardReference);
    // Same Unique again (another page, back on the tab): no second call.
    expect((await search('owned', [unique])).member[0].mainEffect).toBe('Quand je suis joué…');
  });

  it('keeps the powers of the ownership API when the cards API fails', async () => {
    const page = search('owned', [unique]);
    http.expectOne((r) => r.url.endsWith('/api/cards/batch')).flush('down', { status: 502, statusText: 'Bad Gateway' });
    expect((await page).member[0]).toEqual(expect.objectContaining({ forestPower: 1, mountainPower: 3, oceanPower: 0 }));
  });

  it('asks the cards API nothing without a Unique', async () => {
    expect((await search('collection', [common])).member.length).toBe(1);
  });
});
