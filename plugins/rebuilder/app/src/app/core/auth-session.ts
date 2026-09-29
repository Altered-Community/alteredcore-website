import type { Signal } from '@angular/core';
import type { Observable } from 'rxjs';

/**
 * The user's session, as seen by the decks API client. Provided by `embed.config.ts`:
 * `HostAuthSession` (the site's PHP session, `src/app/embed/`). Tests use `GuestSession`
 * (`src/testing/guest-session.ts`).
 */
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
