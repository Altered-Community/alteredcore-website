import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { lastValueFrom } from 'rxjs';
import { DecksApiService } from './decks-api.service';
import type { Deck } from './models';

const decks = (from: number, count: number): Deck[] => Array.from({ length: count }, (_, i) => ({ id: `d${from + i}`, name: `Deck ${from + i}` }));

describe('DecksApiService.listAllMine', () => {
  let http: HttpTestingController;
  let api: DecksApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    api = TestBed.inject(DecksApiService);
  });
  afterEach(() => http.verify());

  const expectPage = (page: number) =>
    http.expectOne((r) => r.url === `${api.baseUrl}/api/decks` && r.params.get('page') === String(page) && r.params.get('itemsPerPage') === '2');

  it('follows the pages until a short one', async () => {
    const all = lastValueFrom(api.listAllMine(2));
    expectPage(1).flush({ member: decks(1, 2) });
    expectPage(2).flush(decks(3, 2));
    expectPage(3).flush({ member: decks(5, 1) });
    expect((await all).map((d) => d.id)).toEqual(['d1', 'd2', 'd3', 'd4', 'd5']);
  });

  it('stops on an empty page, drops duplicates, and caps the number of requests', async () => {
    const all = lastValueFrom(api.listAllMine(2));
    expectPage(1).flush({ member: decks(1, 2) });
    expectPage(2).flush({ member: decks(2, 2) });
    expectPage(3).flush({ member: [] });
    expect((await all).map((d) => d.id)).toEqual(['d1', 'd2', 'd3']);

    const capped = lastValueFrom(api.listAllMine(2, 2));
    expectPage(1).flush({ member: decks(1, 2) });
    expectPage(2).flush({ member: decks(3, 2) });
    expect((await capped).length).toBe(4);
  });
});
