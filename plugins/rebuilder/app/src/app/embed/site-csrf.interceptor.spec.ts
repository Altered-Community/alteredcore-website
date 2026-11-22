import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ALTERED_CORE, type AlteredCoreHost } from './host';
import { siteCsrfInterceptor } from './site-csrf.interceptor';

const host = {
  csrf: 'tok',
  services: { cards: 'https://cards.example', decks: '/api/v1/services/decks', collection: '/api/v1/services/collection' },
  page: { apiUrl: '/papi/rebuilder/' },
} as unknown as AlteredCoreHost;

describe('siteCsrfInterceptor', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ALTERED_CORE, useValue: host },
        provideHttpClient(withInterceptors([siteCsrfInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => ctrl.verify());

  const tokenOf = (method: string, url: string): string | null => {
    http.request(method, url, { body: {} }).subscribe();
    const req = ctrl.expectOne(url);
    req.flush({});
    return req.request.headers.get('X-CSRF-Token');
  };

  it('adds the token to writes on the relay and on the plugin endpoints', () => {
    expect(tokenOf('POST', '/api/v1/services/decks/api/decks')).toBe('tok');
    expect(tokenOf('PATCH', '/api/v1/services/collection/api/items/1')).toBe('tok');
    expect(tokenOf('PUT', '/papi/rebuilder/notes')).toBe('tok');
  });

  it('leaves reads, public services and look-alike paths alone', () => {
    expect(tokenOf('GET', '/papi/rebuilder/notes')).toBeNull();
    expect(tokenOf('POST', 'https://cards.example/api/cards/batch')).toBeNull();
    expect(tokenOf('POST', '/api/v1/services/decksx/api/decks')).toBeNull();
    expect(tokenOf('POST', '/papi/other-plugin/notes')).toBeNull();
  });
});
