import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { deckUrl } from '../core/api-urls';
import { DecksApiService } from '../core/decks-api.service';
import type { AlteredCoreHost } from './host';
import { clearPrefetched, prefetch, prefetchPage, takePrefetched } from './prefetch';
import { prefetchInterceptor } from './prefetch.interceptor';

const realFetch = globalThis.fetch;
let fetched: string[];

function answer(status: number, body: unknown): void {
  globalThis.fetch = ((url: string) => {
    fetched.push(url);
    return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
  }) as typeof fetch;
}

const host = (slug: string) => ({ services: { decks: '/api/v1/services/decks' }, page: { slug } }) as unknown as AlteredCoreHost;

describe('prefetch', () => {
  let http: HttpTestingController;
  let client: HttpClient;

  beforeEach(() => {
    fetched = [];
    clearPrefetched();
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([prefetchInterceptor])), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    http.verify();
  });

  it('prefetches the URL DecksApiService.get() requests', () => {
    const api = TestBed.inject(DecksApiService);
    api.get('01a1-x y', 'fr').subscribe();
    const req = http.expectOne(() => true);
    expect(req.request.urlWithParams).toBe(deckUrl(api.baseUrl, '01a1-x y', 'fr'));
    req.flush({});
  });

  it('prefetches the deck of the deck page and of the editor only, never a guest deck', () => {
    answer(200, {});
    prefetchPage(host('deck'), '?id=abc&tab=main');
    prefetchPage(host('deckbuilder'), '?id=def');
    prefetchPage(host('deckbuilder'), '?id=guest-123');
    prefetchPage(host('deckbuilder'), '');
    prefetchPage(host('decks'), '?id=ghi');
    expect(fetched).toEqual([deckUrl('/api/v1/services/decks', 'abc', 'fr'), deckUrl('/api/v1/services/decks', 'def', 'fr')]);
  });

  it('answers the app with the prefetched response, once', async () => {
    answer(200, { id: 'abc', name: 'Deck' });
    prefetch('/api/x?locale=fr');
    expect(await firstValueFrom(client.get('/api/x', { params: { locale: 'fr' } }))).toEqual({ id: 'abc', name: 'Deck' });
    http.expectNone('/api/x?locale=fr');

    const again = firstValueFrom(client.get('/api/x', { params: { locale: 'fr' } }));
    http.expectOne('/api/x?locale=fr').flush({ id: 'abc', name: 'Fresh' });
    expect(await again).toEqual({ id: 'abc', name: 'Fresh' });
  });

  it('sends the app\'s own request when the prefetch failed', async () => {
    answer(404, { title: 'Not Found' });
    prefetch('/api/missing');
    const res = firstValueFrom(client.get('/api/missing'));
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve));
    http.expectOne('/api/missing').flush({ title: 'Not Found' }, { status: 404, statusText: 'Not Found' });
    await expect(res).rejects.toMatchObject({ status: 404 });
  });

  it('leaves other methods and response types to the network', async () => {
    answer(200, 'text');
    prefetch('/api/t');
    const text = firstValueFrom(client.get('/api/t', { responseType: 'text' }));
    http.expectOne('/api/t').flush('from the network');
    expect(await text).toBe('from the network');
    expect(takePrefetched('/api/t')).toBeDefined();
  });
});
