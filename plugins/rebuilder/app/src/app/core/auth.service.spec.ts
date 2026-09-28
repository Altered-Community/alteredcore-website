import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { GUEST_DECKS_KEY } from './guest-deck.service';
import { ACCESS_EXP_KEY, ACCESS_TOKEN_KEY, AuthService, decodeJwtPayload } from './auth.service';
import { codeChallengeS256 } from './pkce';

const jwt = (payload: object) => `h.${btoa(JSON.stringify(payload)).replace(/=+$/g, '')}.s`;

describe('AuthService', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    // Confirmed guest: the constructor must not probe /auth/refresh unless a test opts in.
    localStorage.setItem('arb.can_refresh', '0');
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('builds an S256 authorization URL and keeps the verifier out of it', async () => {
    const auth = TestBed.inject(AuthService);
    const url = await auth.authorizationUrl('http://localhost:4200/login', 'discord');
    expect(url).toBeTruthy();
    const parsed = new URL(url!);
    expect(parsed.origin + parsed.pathname).toBe('https://auth.altered.re/realms/players/protocol/openid-connect/auth');
    expect(parsed.searchParams.get('client_id')).toBe('deckbuilder.yutsa.fr');
    expect(parsed.searchParams.get('response_type')).toBe('code');
    expect(parsed.searchParams.get('scope')).toBe('openid profile');
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
    expect(parsed.searchParams.get('kc_idp_hint')).toBe('discord');
    expect(parsed.searchParams.get('redirect_uri')).toBe('http://localhost:4200/login');
    const verifier = sessionStorage.getItem('arb.pkce_verifier')!;
    expect(parsed.searchParams.get('code_challenge')).toBe(await codeChallengeS256(verifier));
    expect(url).not.toContain(verifier);
    expect(parsed.searchParams.get('state')).toBe(sessionStorage.getItem('arb.oauth_state'));
  });

  it('exchanges the code and shows the pseudo, never the email', async () => {
    const auth = TestBed.inject(AuthService);
    const url = await auth.authorizationUrl('http://localhost:4200/login');
    const state = new URL(url!).searchParams.get('state');
    auth.completeLogin({ code: 'auth-code', state, error: null, description: null });
    const req = http.expectOne('/auth/token');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.get('X-Auth-Bff')).toBe('1');
    expect(req.request.body).toEqual({
      code: 'auth-code',
      redirectUri: 'http://localhost:4200/login',
      codeVerifier: sessionStorage.getItem('arb.pkce_verifier'),
    });
    req.flush({
      access_token: jwt({ pseudo: 'Yutsa', preferred_username: 'player@example.test', email: 'player@example.test' }),
      id_token: jwt({ pseudo: 'Yutsa', email: 'player@example.test' }),
      expires_in: 300,
      token_type: 'Bearer',
      has_refresh: true,
    });
    expect(auth.username()).toBe('Yutsa');
    expect(auth.isLoggedIn()).toBe(true);
    expect(decodeJwtPayload(sessionStorage.getItem(ACCESS_TOKEN_KEY))?.['pseudo']).toBe('Yutsa');
    expect(sessionStorage.getItem('arb.can_refresh')).toBe('1');
    expect(localStorage.getItem('arb.can_refresh')).toBe('1');
    expect(sessionStorage.getItem(ACCESS_TOKEN_KEY)).not.toContain('refresh');
    expect(sessionStorage.getItem('arb.pkce_verifier')).toBeNull();

    auth.completeLogin({ code: 'auth-code', state, error: null, description: null });
    http.expectNone('/auth/token');
  });

  it('rejects a mismatched state and a cancelled login', async () => {
    const auth = TestBed.inject(AuthService);
    await auth.authorizationUrl('http://localhost:4200/login');
    auth.completeLogin({ code: 'auth-code', state: 'other', error: null, description: null });
    http.expectNone('/auth/token');
    expect(auth.loginError()).toContain('état invalide');
    expect(auth.isLoggedIn()).toBe(false);

    const again = TestBed.inject(AuthService);
    again.completeLogin({ code: null, state: null, error: 'access_denied', description: null });
    expect(again.loginError()).toContain('annulée');
  });

  it('reads pseudo from the id token when the access token has none', () => {
    const auth = TestBed.inject(AuthService);
    auth.setAccessToken(jwt({ preferred_username: 'player@example.test' }), {
      idToken: jwt({ pseudo: 'Neo', email: 'player@example.test' }),
    });
    expect(auth.username()).toBe('Neo');
    auth.setAccessToken(jwt({ preferred_username: 'player@example.test', email: 'player@example.test' }));
    expect(auth.username()).toBe('Compte');
  });

  it('logout clears the session, calls the BFF, and leaves guest decks in localStorage', () => {
    localStorage.setItem(GUEST_DECKS_KEY, JSON.stringify([{ id: 'guest-1', name: 'Local' }]));
    const auth = TestBed.inject(AuthService);
    auth.setAccessToken(jwt({ pseudo: 'Yutsa' }), { idToken: jwt({ pseudo: 'Yutsa' }), expiresIn: 300 });
    let url = '';
    auth.logout().subscribe((next) => (url = next ?? ''));
    const req = http.expectOne('/auth/logout');
    expect(req.request.headers.get('X-Auth-Bff')).toBe('1');
    req.flush(null);
    expect(url).toContain('https://auth.altered.re/realms/players/protocol/openid-connect/logout');
    expect(url).toContain('client_id=deckbuilder.yutsa.fr');
    expect(url).toContain('post_logout_redirect_uri=');
    expect(url).toContain('id_token_hint=');
    expect(auth.isLoggedIn()).toBe(false);
    expect(auth.username()).toBeNull();
    expect(localStorage.getItem('arb.can_refresh')).toBe('0');
    expect(sessionStorage.getItem('arb.can_refresh')).toBeNull();
    expect(JSON.parse(localStorage.getItem(GUEST_DECKS_KEY) ?? '[]')).toEqual([{ id: 'guest-1', name: 'Local' }]);
  });

  it('drops an expired session when refresh fails and keeps guest decks', () => {
    localStorage.setItem(GUEST_DECKS_KEY, JSON.stringify([{ id: 'guest-1' }]));
    sessionStorage.setItem(ACCESS_TOKEN_KEY, jwt({ pseudo: 'Yutsa', exp: 1 }));
    sessionStorage.setItem(ACCESS_EXP_KEY, '1');
    sessionStorage.setItem('arb.can_refresh', '1');
    const auth = TestBed.inject(AuthService);
    const req = http.expectOne('/auth/refresh');
    req.flush({ error: 'invalid_grant' }, { status: 401, statusText: 'Unauthorized' });
    expect(auth.isLoggedIn()).toBe(false);
    expect(auth.sessionNotice()).toContain('Session expirée');
    expect(localStorage.getItem(GUEST_DECKS_KEY)).toContain('guest-1');
  });

  it('replaces the access token when refresh succeeds', () => {
    const auth = TestBed.inject(AuthService);
    auth.setAccessToken(jwt({ pseudo: 'Yutsa', exp: 1 }), { expiresIn: -10 });
    sessionStorage.setItem('arb.can_refresh', '1');
    let ok = false;
    auth.refresh().subscribe((next) => (ok = next));
    http.expectOne('/auth/refresh').flush({
      access_token: jwt({ pseudo: 'Yutsa', exp: 4_000_000_000 }),
      expires_in: 300,
      token_type: 'Bearer',
    });
    expect(ok).toBe(true);
    expect(auth.username()).toBe('Yutsa');
    expect(auth.isLoggedIn()).toBe(true);
  });

  it('does not call refresh for a confirmed guest', () => {
    TestBed.inject(AuthService);
    http.expectNone('/auth/refresh');
  });

  it('restores a session from the refresh cookie when sessionStorage is empty', () => {
    localStorage.setItem('arb.can_refresh', '1');
    const auth = TestBed.inject(AuthService);
    expect(auth.sessionRestoring()).toBe(true);
    expect(auth.isLoggedIn()).toBe(false);
    http.expectOne('/auth/refresh').flush({
      access_token: jwt({ pseudo: 'Yutsa', exp: 4_000_000_000 }),
      id_token: jwt({ pseudo: 'Yutsa' }),
      expires_in: 300,
      has_refresh: true,
      token_type: 'Bearer',
    });
    expect(auth.isLoggedIn()).toBe(true);
    expect(auth.username()).toBe('Yutsa');
    expect(auth.sessionRestoring()).toBe(false);
    expect(sessionStorage.getItem(ACCESS_TOKEN_KEY)).toBeTruthy();
    expect(localStorage.getItem('arb.can_refresh')).toBe('1');
  });

  it('probes once when no flag is stored and remembers a guest without a session notice', () => {
    localStorage.removeItem('arb.can_refresh');
    const auth = TestBed.inject(AuthService);
    expect(auth.sessionRestoring()).toBe(false);
    http.expectOne('/auth/refresh').flush({ error: 'invalid_grant' }, { status: 401, statusText: 'Unauthorized' });
    expect(auth.isLoggedIn()).toBe(false);
    expect(auth.sessionNotice()).toBeNull();
    expect(localStorage.getItem('arb.can_refresh')).toBe('0');
    auth.refresh().subscribe();
    http.expectNone('/auth/refresh');
  });

  it('reports an expired session when the remembered cookie is rejected', () => {
    localStorage.setItem('arb.can_refresh', '1');
    const auth = TestBed.inject(AuthService);
    http.expectOne('/auth/refresh').flush({ error: 'invalid_grant' }, { status: 400, statusText: 'Bad Request' });
    expect(auth.isLoggedIn()).toBe(false);
    expect(auth.sessionNotice()).toContain('Session expirée');
    expect(localStorage.getItem('arb.can_refresh')).toBe('0');
    expect(localStorage.getItem(GUEST_DECKS_KEY)).toBeNull();
  });

  it('keeps the refresh flag when the BFF is unreachable', () => {
    localStorage.setItem('arb.can_refresh', '1');
    const auth = TestBed.inject(AuthService);
    http.expectOne('/auth/refresh').error(new ProgressEvent('error'));
    expect(auth.isLoggedIn()).toBe(false);
    expect(auth.sessionNotice()).toBeNull();
    expect(auth.sessionRestoring()).toBe(false);
    expect(localStorage.getItem('arb.can_refresh')).toBe('1');
  });
});

describe('decodeJwtPayload', () => {
  it('reads a payload and ignores garbage', () => {
    const payload = btoa(JSON.stringify({ pseudo: 'Yutsa' })).replace(/=+$/g, '');
    expect(decodeJwtPayload(`h.${payload}.s`)?.['pseudo']).toBe('Yutsa');
    expect(decodeJwtPayload('not-a-jwt')).toBeNull();
    expect(decodeJwtPayload(null)).toBeNull();
  });
});
