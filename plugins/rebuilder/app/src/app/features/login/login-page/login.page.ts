import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, concatMap, from, map, of, toArray } from 'rxjs';
import { AuthService } from '../../../core/auth.service';
import { DecksApiService } from '../../../core/decks-api.service';
import { GuestDeckService } from '../../../core/guest-deck.service';
import type { Deck } from '../../../core/models';
import { ArButton } from '../../../ui/buttons';
import { ArIcon } from '../../../ui/icon';
import { ArBreakpointService } from '../../../ui/layout.services';
import { ArAppBar, ArAvatar, ArBackButton, ArSiteFooter } from '../../../ui/nav';

/**
 * Connexion. Username/password and Discord are on the Altered Keycloak page.
 * This page starts authorization code + PKCE; the BFF exchanges the code.
 */
@Component({
  selector: 'app-login-page',
  imports: [RouterLink, ArAppBar, ArBackButton, ArButton, ArIcon, ArAvatar, ArSiteFooter],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  protected readonly auth = inject(AuthService);
  protected readonly bp = inject(ArBreakpointService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly guests = inject(GuestDeckService);
  private readonly decksApi = inject(DecksApiService);
  protected readonly copying = signal(false);
  protected readonly copyMessage = signal<string | null>(null);
  protected readonly guestCount = computed(() => this.guests.decks().length);

  constructor() {
    const query = this.route.snapshot.queryParamMap;
    const code = query.get('code');
    const error = query.get('error');
    if (code || error) {
      this.auth.completeLogin({
        code,
        state: query.get('state'),
        error,
        description: query.get('error_description'),
      });
      void this.router.navigate(['/login'], { replaceUrl: true });
    }
  }

  signIn(idp?: 'discord'): void {
    this.auth.loginError.set(null);
    void this.auth.authorizationUrl(`${location.origin}/login`, idp).then((url) => {
      if (!url) {
        this.auth.loginError.set(
          'Connexion indisponible : aucun client Keycloak n’est configuré pour cette application. Vos decks restent enregistrés en mode invité.',
        );
        return;
      }
      location.assign(url);
    });
  }

  logout(): void {
    this.auth.logout().subscribe((url) => {
      if (url) location.assign(url);
    });
  }

  /** Optional: copies local guest decks to the account and leaves the originals on this device. */
  copyGuestDecks(): void {
    const decks = this.guests.decks();
    if (!decks.length || this.copying()) return;
    this.copying.set(true);
    this.copyMessage.set(null);
    from(decks)
      .pipe(
        concatMap((deck) =>
          this.decksApi.create(guestToWrite(deck)).pipe(
            map(() => true),
            catchError(() => of(false)),
          ),
        ),
        toArray(),
      )
      .subscribe({
        next: (results) => {
          this.copying.set(false);
          const ok = results.filter(Boolean).length;
          this.copyMessage.set(
            ok
              ? `${ok} deck${ok > 1 ? 's' : ''} copié${ok > 1 ? 's' : ''} sur le compte. Les decks invités restent sur cet appareil.`
              : 'Aucun deck n’a pu être copié. Les decks invités restent sur cet appareil.',
          );
        },
        error: () => {
          this.copying.set(false);
          this.copyMessage.set('La copie a échoué. Les decks invités restent sur cet appareil.');
        },
      });
  }
}

function guestToWrite(deck: Deck) {
  return {
    name: deck.name,
    format: deck.format,
    isPublic: deck.isPublic ?? false,
    isDraft: deck.isDraft ?? true,
    deckCards: (deck.deckCards ?? [])
      .filter((line) => line.quantity > 0 && line.cardReference)
      .map((line) => ({ cardReference: line.cardReference, quantity: line.quantity })),
  };
}
