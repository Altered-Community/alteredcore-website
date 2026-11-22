import { Service, signal, type Signal } from '@angular/core';
import { of, type Observable } from 'rxjs';

/**
 * Session of the site user, for the decks API: `HostAuthSession` (the site's PHP session, the
 * decks relay adds the token server-side), provided by `embedConfig`. Without it (unit tests), a guest.
 */
@Service({ factory: () => new GuestSession() })
export abstract class AuthSession {
  /** Current access token, `null` for a guest. */
  abstract readonly token: Signal<string | null>;
  abstract readonly isLoggedIn: Signal<boolean>;
  /** Display name, `null` for a guest. */
  abstract readonly username: Signal<string | null>;
  /** True while a previous session is being restored (avoids flashing the guest UI). */
  abstract readonly sessionRestoring: Signal<boolean>;
  /** Message to show when the session expired and could not be renewed. */
  abstract readonly sessionNotice: Signal<string | null>;
  /** Resolves once the token is fresh enough for a request (no HTTP when it already is). */
  abstract ensureFresh(): Observable<void>;
  /** Gets a new access token after a 401; false when the session is gone. */
  abstract refresh(): Observable<boolean>;
}

/** No user: guest decks only. */
class GuestSession extends AuthSession {
  readonly token = signal<string | null>(null).asReadonly();
  readonly isLoggedIn = signal(false).asReadonly();
  readonly username = signal<string | null>(null).asReadonly();
  readonly sessionRestoring = signal(false).asReadonly();
  readonly sessionNotice = signal<string | null>(null).asReadonly();
  ensureFresh(): Observable<void> {
    return of(undefined);
  }
  refresh(): Observable<boolean> {
    return of(false);
  }
}
