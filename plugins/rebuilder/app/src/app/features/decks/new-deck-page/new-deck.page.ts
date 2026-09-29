import { Component, afterNextRender, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { DeckStore } from '../../../core/deck-store';
import { ArNavigationHistory } from '../../../ui/nav';
import { ArOverlayService } from '../../../ui/overlay';
import { openNewDeck } from '../../shared/new-deck/new-deck.overlay';

/** `/decks/new`: skeleton backdrop + « Nouveau deck » overlay (full screen on mobile). */
@Component({
  selector: 'app-new-deck-page',
  templateUrl: './new-deck.page.html',
  styleUrl: './new-deck.page.scss',
})
export class NewDeckPage {
  private readonly overlay = inject(ArOverlayService);
  private readonly router = inject(Router);
  private readonly store = inject(DeckStore);
  private readonly history = inject(ArNavigationHistory);
  private readonly location = inject(Location);

  constructor() {
    afterNextRender(() => {
      openNewDeck(this.overlay).afterClosed.subscribe((res) => {
        if (!res) {
          this.leave();
          return;
        }
        let created = false;
        this.store.createDeck(res).subscribe({
          next: (deck) => {
            created = true;
            void this.router.navigate(['/decks', deck.id, 'edit'], { replaceUrl: true });
          },
          // « Annuler » in the create-failure window ends without a deck.
          complete: () => {
            if (!created) this.leave();
          },
        });
      });
    });
  }

  /** Back to the page that opened the form (home, decks list…). */
  private leave(): void {
    if (this.history.canGoBack) this.location.back();
    else void this.router.navigateByUrl('/decks', { replaceUrl: true });
  }
}
