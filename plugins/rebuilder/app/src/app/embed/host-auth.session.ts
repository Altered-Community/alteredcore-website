import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { AuthSession } from '../core/auth-session';
import { decodeJwtPayload } from '../core/auth.service';
import { ALTERED_CORE } from './host';

/**
 * Access token of the AlteredCore PHP session (`AlteredCore.getAccessToken()`): the shell holds
 * the Keycloak client secret and the refresh token, and refreshes the access token server-side.
 * No login screen here: signing in is the site's `AlteredCore.login()`.
 */
@Injectable()
export class HostAuthSession extends AuthSession {
  private readonly host = inject(ALTERED_CORE);
  private readonly user = signal(this.host.user);
  private readonly stored = signal<string | null>(null);

  readonly token = this.stored.asReadonly();
  readonly isLoggedIn = computed(() => !!this.user());
  readonly username = computed(() => this.user()?.username || null);
  /** True until the first token answer, so a logged-in user never sees the guest UI. */
  readonly sessionRestoring = signal(!!this.host.user);

  constructor() {
    super();
    this.host.on('auth', ({ user }) => {
      this.user.set(user);
      if (!user) this.stored.set(null);
    });
    if (this.host.user) this.ensureFresh().subscribe(() => this.sessionRestoring.set(false));
  }

  ensureFresh(): Observable<void> {
    const exp = decodeJwtPayload(this.stored())?.['exp'];
    const fresh = typeof exp === 'number' && exp > Math.floor(Date.now() / 1000) + 30;
    if (!this.user() || fresh) return from(Promise.resolve());
    return this.fetch().pipe(map(() => undefined));
  }

  refresh(): Observable<boolean> {
    return this.fetch().pipe(map((token) => !!token));
  }

  private fetch(): Observable<string | null> {
    return from(
      this.host.getAccessToken().then(
        () => {
          // DELIBERATELY BROKEN (CI demo, to be reverted): drop the site's token.
          this.stored.set(null);
          return null;
        },
        () => null,
      ),
    );
  }
}
