import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { addBlockedReason } from '../../../core/deck-rules';
import { DeckStore } from '../../../core/deck-store';
import { AuthSession } from '../../../core/auth-session';
import type { Card } from '../../../core/models';
import { ArButton } from '../../../ui/buttons';
import { ArVirtualGrid } from '../../../ui/containers';
import { ArInfiniteSentinel } from '../../../ui/infinite';
import { ArCardTile, ArDeckRow } from '../../../ui/metier';
import { ArOverlayService } from '../../../ui/overlay';
import { FavoritesService } from '../../../core/favorites.service';
import { openCardZoom } from '../../shared/card-zoom/card-zoom.overlay';
import { CardSearchStore } from '../card-search.store';

@Component({
  selector: 'app-search-results',
  imports: [ArCardTile, ArDeckRow, ArInfiniteSentinel, ArButton, RouterLink, ArVirtualGrid],
  templateUrl: './search-results.html',
  styleUrl: './search-results.scss',
})
export class SearchResults {
  protected readonly search = inject(CardSearchStore);
  protected readonly deck = inject(DeckStore);
  protected readonly auth = inject(AuthSession);
  private readonly overlay = inject(ArOverlayService);
  protected readonly favorites = inject(FavoritesService);
  readonly layout = input<'grid' | 'list'>('grid');
  /** Card browser: cards without quantity controls. */
  readonly browse = input(false);
  protected readonly skeletons = computed(() => Array.from({ length: this.search.cards().length ? 3 : 6 }));

  /** Why a card cannot be added in the deck's format (a Unique in a No Unique format). */
  protected blockedReason(card: Card): string | null {
    return addBlockedReason(card, this.deck.format());
  }

  /** A result's visual: the card large, with its copies in the deck (the site's deck builder lightbox); the card alone in the browser. */
  protected zoom(card: Card): void {
    const editable = !this.browse() && this.deck.editable() && !this.blockedReason(card);
    openCardZoom(this.overlay, {
      card,
      quantity: editable ? { value: this.deck.quantities().get(card.reference) ?? 0, max: this.deck.maxFor(card), change: (n) => this.deck.setQuantity(card, n) } : undefined,
    });
  }

}
