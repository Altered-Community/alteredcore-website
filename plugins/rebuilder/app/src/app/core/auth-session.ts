import { Injectable, inject, type Signal } from '@angular/core';
import type { Observable } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Who supplies the Keycloak access token sent to the decks API.
 * Standalone and Capacitor: `AuthService` (PKCE login + auth BFF, the default).
 * Embedded in the AlteredCore site: `HostAuthSession` (the shell's PHP session, `src/app/embed/`).
 */
@Injectable({ providedIn: 'root', useFactory: () => inject(AuthService) })
export abstract class AuthSession {
  /** Current access token, `null` for a guest. */
  abstract readonly token: Signal<string | null>;
  abstract readonly isLoggedIn: Signal<boolean>;
  /** Display name, `null` for a guest. */
  abstract readonly username: Signal<string | null>;
  /** True while a previous session is being restored (avoids flashing the guest UI). */
  abstract readonly sessionRestoring: Signal<boolean>;
  /** Resolves once the token is fresh enough for a request (no HTTP when it already is). */
  abstract ensureFresh(): Observable<void>;
  /** Gets a new access token after a 401; false when the session is gone. */
  abstract refresh(): Observable<boolean>;
}
