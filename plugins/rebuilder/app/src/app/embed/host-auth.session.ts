import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AuthSession } from '../core/auth-session';
import { ALTERED_CORE } from './host';

/**
 * Session of the AlteredCore site. The browser holds no Keycloak token: decks calls go to the
 * site's relay (`AlteredCore.services.decks`), which adds the session's token server-side and
 * renews it. So `token` stays null and requests carry no Authorization header; signing in is the
 * site's `AlteredCore.login()`.
 */
@Injectable()
export class HostAuthSession extends AuthSession {
  private readonly host = inject(ALTERED_CORE);
  private readonly user = signal(this.host.user);

  readonly token = signal<string | null>(null).asReadonly();
  readonly isLoggedIn = computed(() => !!this.user());
  readonly username = computed(() => this.user()?.username || null);
  readonly sessionRestoring = signal(false).asReadonly();
  readonly sessionNotice = signal<string | null>(null).asReadonly();

  constructor() {
    super();
    this.host.on('auth', ({ user }) => this.user.set(user));
  }

  ensureFresh(): Observable<void> {
    return of(undefined);
  }

  /** Renewal happens in the relay; a 401 that reaches the app means the session is gone. */
  refresh(): Observable<boolean> {
    return of(false);
  }
}
