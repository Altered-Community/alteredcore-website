import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Service, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, share, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import type { AuthSession } from './auth-session';
import { createPkcePair, randomUrlToken } from './pkce';

export const ACCESS_TOKEN_KEY = 'arb.access_token';
export const ID_TOKEN_KEY = 'arb.id_token';
export const ACCESS_EXP_KEY = 'arb.access_exp';
const CAN_REFRESH_KEY = 'arb.can_refresh';
const VERIFIER_KEY = 'arb.pkce_verifier';
const STATE_KEY = 'arb.oauth_state';
const REDIRECT_KEY = 'arb.oauth_redirect';

export interface OAuthCallback {
  code: string | null;
  state: string | null;
  error: string | null;
  description: string | null;
}

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  id_token?: string;
  token_type?: string;
  /** True when the BFF stored a refresh token in the HttpOnly cookie. The token itself is absent. */
  has_refresh?: boolean;
}

/**
 * Keycloak authorization-code login for the confidential client `deckbuilder.yutsa.fr`.
 * The browser does PKCE and stores the access token for this tab. The client secret and the
 * refresh token stay on the same-origin auth BFF (`environment.authBffUrl`). A deploy replaces
 * the document; the HttpOnly refresh cookie is what logs the user back in.
 */
@Service()
export class AuthService implements AuthSession {
  private readonly http = inject(HttpClient);
  private readonly stored = signal<string | null>(readStorage(ACCESS_TOKEN_KEY));
  private readonly idTokenSig = signal<string | null>(readStorage(ID_TOKEN_KEY));
  private refreshInflight: Observable<boolean> | null = null;
  private handledCallback: string | null = null;

  readonly token = computed(() => this.stored());
  readonly isLoggedIn = computed(() => !!this.stored());
  readonly loginPending = signal(false);
  readonly loginError = signal<string | null>(null);
  /**
   * True while a known refresh cookie is being exchanged for a new access token.
   * A cold load has no sessionStorage; this avoids flashing the guest UI first.
   */
  readonly sessionRestoring = signal(false);
  /** Set when an expired access token could not be refreshed. Guest decks are untouched. */
  readonly sessionNotice = signal<string | null>(null);

  /**
   * Display name is the Keycloak `pseudo` only (access token, else id token).
   * `preferred_username` on this realm is the email and must not be shown.
   */
  readonly username = computed(() => {
    const name = pseudoOf(this.stored()) ?? pseudoOf(this.idTokenSig());
    if (name) return name;
    return this.stored() ? 'Compte' : null;
  });

  readonly keycloakConfigured = computed(
    () => !!(environment.keycloakUrl && environment.keycloakRealm && environment.keycloakClientId && environment.authBffUrl),
  );

  constructor() {
    this.restoreSession();
  }

  setAccessToken(token: string | null, options?: { idToken?: string | null; expiresIn?: number }): void {
    const next = token?.trim() || null;
    this.stored.set(next);
    writeStorage(ACCESS_TOKEN_KEY, next);
    if (!next) {
      this.idTokenSig.set(null);
      writeStorage(ID_TOKEN_KEY, null);
      writeStorage(ACCESS_EXP_KEY, null);
      this.setCanRefresh(false);
      return;
    }
    if (options && 'idToken' in options) {
      const id = options.idToken?.trim() || null;
      this.idTokenSig.set(id);
      writeStorage(ID_TOKEN_KEY, id);
    } else if (!options) {
      // A pasted token is a new session: don't keep a previous id token's pseudo or refresh cookie flag.
      this.idTokenSig.set(null);
      writeStorage(ID_TOKEN_KEY, null);
      this.setCanRefresh(false);
    }
    const exp = expiryFrom(next, options?.expiresIn);
    if (exp != null) writeStorage(ACCESS_EXP_KEY, String(exp));
  }

  /** Starts authorization code + S256 PKCE. `discord` asks Keycloak to open that identity provider. */
  async authorizationUrl(redirectUri: string, idp?: 'discord'): Promise<string | null> {
    if (!this.keycloakConfigured()) return null;
    const { verifier, challenge } = await createPkcePair();
    const state = randomUrlToken();
    writeStorage(VERIFIER_KEY, verifier);
    writeStorage(STATE_KEY, state);
    writeStorage(REDIRECT_KEY, redirectUri);
    const params = new URLSearchParams({
      client_id: environment.keycloakClientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: 'openid profile',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state,
      nonce: randomUrlToken(16),
    });
    if (idp) params.set('kc_idp_hint', idp);
    return `${environment.keycloakUrl}/realms/${environment.keycloakRealm}/protocol/openid-connect/auth?${params}`;
  }

  /** Handles the return to `/login`. Safe to call once; a repeated code is ignored. */
  completeLogin(callback: OAuthCallback): void {
    const marker = callback.code || callback.error || '';
    if (!marker || this.handledCallback === marker) return;
    this.handledCallback = marker;
    this.loginError.set(null);
    if (callback.error) {
      this.clearPkce();
      this.loginError.set(loginErrorMessage(callback.error, callback.description));
      return;
    }
    const expected = readStorage(STATE_KEY);
    const verifier = readStorage(VERIFIER_KEY);
    const redirectUri = readStorage(REDIRECT_KEY);
    if (!callback.code || !callback.state || !expected || callback.state !== expected || !verifier || !redirectUri) {
      this.clearPkce();
      this.loginError.set('Connexion interrompue (état invalide). Vos decks invité restent sur cet appareil.');
      return;
    }
    this.loginPending.set(true);
    this.http
      .post<TokenResponse>(`${environment.authBffUrl}/token`, {
        code: callback.code,
        redirectUri,
        codeVerifier: verifier,
      }, { headers: bffHeaders(), withCredentials: true })
      .subscribe({
        next: (body) => {
          this.clearPkce();
          this.applyTokenResponse(body);
          this.loginPending.set(false);
          this.sessionNotice.set(null);
        },
        error: (err: unknown) => {
          this.clearPkce();
          this.loginPending.set(false);
          this.loginError.set(httpErrorMessage(err));
        },
      });
  }

  /** Refreshes the access token with the BFF cookie. False leaves a still-valid token in place. */
  refresh(): Observable<boolean> {
    // `0` means a confirmed guest (or an explicit logout). Missing means "try the cookie once".
    if (this.refreshOptOut()) return of(false);
    if (!this.refreshInflight) {
      const hadRefresh = this.remembersRefresh();
      this.refreshInflight = this.http
        .post<TokenResponse>(`${environment.authBffUrl}/refresh`, {}, { headers: bffHeaders(), withCredentials: true })
        .pipe(
          tap((body) => this.applyTokenResponse(body)),
          map(() => true),
          catchError((err: unknown) => {
            const status = err instanceof HttpErrorResponse ? err.status : 0;
            // 400 is Keycloak invalid_grant forwarded by the BFF. 401 is a missing cookie.
            const rejected = status === 400 || status === 401;
            if (rejected && (this.isExpired() || (!this.stored() && hadRefresh))) this.clearExpiredSession();
            else if (rejected && !this.stored()) this.setCanRefresh(false);
            return of(false);
          }),
          finalize(() => {
            this.refreshInflight = null;
          }),
          share(),
        );
    }
    return this.refreshInflight;
  }

  /** No HTTP when the access token has no expiry yet or is still fresh. */
  ensureFresh(): Observable<void> {
    const exp = this.accessExp();
    if (!this.stored() || exp == null || exp > nowSeconds() + 30) return of(undefined);
    return this.refresh().pipe(map(() => undefined));
  }

  /** Clears the local session after the BFF drops the refresh cookie. Returns the Keycloak end-session URL. */
  logout(): Observable<string | null> {
    const url = this.endSessionUrl();
    this.loginError.set(null);
    this.sessionNotice.set(null);
    return this.http.post(`${environment.authBffUrl}/logout`, {}, { headers: bffHeaders(), withCredentials: true }).pipe(
      catchError(() => of(null)),
      map(() => {
        this.setAccessToken(null);
        this.clearPkce();
        return url;
      }),
    );
  }

  endSessionUrl(): string | null {
    if (!this.keycloakConfigured() || typeof location === 'undefined') return null;
    const params = new URLSearchParams({
      client_id: environment.keycloakClientId,
      post_logout_redirect_uri: `${location.origin}/login`,
    });
    const id = this.idTokenSig();
    if (id) params.set('id_token_hint', id);
    return `${environment.keycloakUrl}/realms/${environment.keycloakRealm}/protocol/openid-connect/logout?${params}`;
  }

  /**
   * sessionStorage dies with the tab, and a deploy is a new document load.
   * The refresh token itself is the HttpOnly cookie; this only remembers that it exists.
   */
  private restoreSession(): void {
    const exp = this.accessExp();
    const fresh = !!this.stored() && (exp == null || exp > nowSeconds());
    if (fresh) {
      if (readStorage(CAN_REFRESH_KEY) === '1') this.setCanRefresh(true);
      return;
    }
    if (this.refreshOptOut()) return;
    const restoring = this.remembersRefresh();
    if (restoring) this.sessionRestoring.set(true);
    this.refresh().subscribe(() => {
      if (restoring) this.sessionRestoring.set(false);
    });
  }

  private applyTokenResponse(body: TokenResponse): void {
    if (!body.access_token) return;
    this.setAccessToken(body.access_token, { idToken: body.id_token ?? this.idTokenSig(), expiresIn: body.expires_in });
    if (body.has_refresh) this.setCanRefresh(true);
  }

  /** localStorage survives a new tab and a Deploy VPS reload. sessionStorage is the pre-fix copy. */
  private remembersRefresh(): boolean {
    return readLocal(CAN_REFRESH_KEY) === '1' || readStorage(CAN_REFRESH_KEY) === '1';
  }

  private refreshOptOut(): boolean {
    return readLocal(CAN_REFRESH_KEY) === '0' && readStorage(CAN_REFRESH_KEY) !== '1';
  }

  private setCanRefresh(on: boolean): void {
    writeLocal(CAN_REFRESH_KEY, on ? '1' : '0');
    writeStorage(CAN_REFRESH_KEY, on ? '1' : null);
  }

  private clearExpiredSession(): void {
    this.setAccessToken(null);
    this.clearPkce();
    this.sessionNotice.set('Session expirée. Vos decks invités restent sur cet appareil.');
  }

  private clearPkce(): void {
    writeStorage(VERIFIER_KEY, null);
    writeStorage(STATE_KEY, null);
    writeStorage(REDIRECT_KEY, null);
  }

  private accessExp(): number | null {
    const raw = readStorage(ACCESS_EXP_KEY);
    if (raw) {
      const n = Number(raw);
      if (Number.isFinite(n)) return n;
    }
    const exp = decodeJwtPayload(this.stored())?.['exp'];
    return typeof exp === 'number' ? exp : null;
  }

  private isExpired(): boolean {
    const exp = this.accessExp();
    return exp != null && exp <= nowSeconds();
  }
}

function bffHeaders(): HttpHeaders {
  return new HttpHeaders({ Accept: 'application/json', 'X-Auth-Bff': '1' });
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function expiryFrom(token: string, expiresIn?: number): number | null {
  const claim = decodeJwtPayload(token)?.['exp'];
  const fromJwt = typeof claim === 'number' ? claim : null;
  const fromBody = expiresIn != null && Number.isFinite(expiresIn) ? nowSeconds() + expiresIn : null;
  if (fromJwt != null && fromBody != null) return Math.min(fromJwt, fromBody);
  return fromJwt ?? fromBody;
}

function pseudoOf(token: string | null): string | null {
  const value = decodeJwtPayload(token)?.['pseudo'];
  return typeof value === 'string' && value.trim() ? value : null;
}

function loginErrorMessage(error: string, description: string | null): string {
  if (error === 'access_denied') return 'Connexion annulée. Vos decks invité restent sur cet appareil.';
  if (description?.trim()) return description.trim().slice(0, 300);
  return 'La connexion a échoué. Vos decks invité restent sur cet appareil.';
}

function httpErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const description = err.error?.error_description;
    if (typeof description === 'string' && description.trim()) return description.trim().slice(0, 300);
  }
  return 'La connexion a échoué. Vos decks invité restent sur cet appareil.';
}

function readLocal(key: string): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(key);
}

function writeLocal(key: string, value: string | null): void {
  if (typeof localStorage === 'undefined') return;
  if (value) localStorage.setItem(key, value);
  else localStorage.removeItem(key);
}

function readStorage(key: string): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  return sessionStorage.getItem(key);
}

function writeStorage(key: string, value: string | null): void {
  if (typeof sessionStorage === 'undefined') return;
  if (value) sessionStorage.setItem(key, value);
  else sessionStorage.removeItem(key);
}

export function decodeJwtPayload(token: string | null | undefined): Record<string, unknown> | null {
  const part = token?.split('.')[1];
  if (!part) return null;
  try {
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    const parsed = JSON.parse(decodeURIComponent(escape(json))) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
