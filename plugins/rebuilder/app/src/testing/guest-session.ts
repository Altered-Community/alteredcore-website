import { signal, type Provider } from '@angular/core';
import { of } from 'rxjs';
import { AuthSession } from '../app/core/auth-session';

/** Signed-out session for unit tests (the app itself gets the site's session, `HostAuthSession`). */
export class GuestSession extends AuthSession {
  readonly token = signal<string | null>(null).asReadonly();
  readonly isLoggedIn = signal(false).asReadonly();
  readonly username = signal<string | null>(null).asReadonly();
  readonly sessionRestoring = signal(false).asReadonly();
  readonly sessionNotice = signal<string | null>(null).asReadonly();

  ensureFresh() {
    return of(undefined);
  }

  refresh() {
    return of(false);
  }
}

export function provideGuestSession(): Provider {
  return { provide: AuthSession, useClass: GuestSession };
}
