import { Component, afterNextRender, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { DeckStore } from '../../../core/deck-store';
import { AcNavigationHistory } from '../../../ui/nav';
import { AcOverlayService } from '../../../ui/overlay';
import { openNewDeck } from '../../shared/new-deck/new-deck.overlay';

/** `/decks/new`: skeleton backdrop + « Nouveau deck » overlay (full screen on mobile). */
@Component({
  selector: 'app-new-deck-page',
  templateUrl: './new-deck.page.html',
  styleUrl: './new-deck.page.scss',
})
export class NewDeckPage {
  private readonly overlay = inject(AcOverlayService);
  private readonly router = inject(Router);
  private readonly store = inject(DeckStore);
  private readonly history = inject(AcNavigationHistory);
  private readonly location = inject(Location);

  constructor() {
    afterNextRender(() => {
      openNewDeck(this.overlay).afterClosed.subscribe((res) => {
        if (!res) {
          // Cancel returns to the page that opened the form (home, decks list…).
          if (this.history.canGoBack) this.location.back();
          else void this.router.navigateByUrl('/decks', { replaceUrl: true });
          return;
        }
        this.store.createDeck(res).subscribe((deck) => {
          void this.router.navigate(['/decks', deck.id, 'edit'], { replaceUrl: true });
        });
      });
    });
  }
}
