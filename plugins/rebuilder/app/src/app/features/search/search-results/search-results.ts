import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { isAccountSource } from '../../../core/card-filters';
import { addBlockedReason } from '../../../core/deck-rules';
import { DeckStore } from '../../../core/deck-store';
import { AuthSession } from '../../../core/auth-session';
import type { Card } from '../../../core/models';
import { AcButton } from '../../../ui/buttons';
import { AcSkeleton, AcVirtualGrid } from '../../../ui/containers';
import { AcInfiniteSentinel } from '../../../ui/infinite';
import { AcCardTile, AcDeckRow } from '../../../ui/metier';
import { AcOverlayService } from '../../../ui/overlay';
import { FavoritesService } from '../../../core/favorites.service';
import { openCardZoom } from '../../shared/card-zoom/card-zoom.overlay';
import { CardSearchStore } from '../card-search.store';
import { EditorAltArts } from '../../editor/editor-alt-arts';

@Component({
  selector: 'app-search-results',
  imports: [AcCardTile, AcDeckRow, AcInfiniteSentinel, AcButton, RouterLink, AcVirtualGrid, AcSkeleton],
  templateUrl: './search-results.html',
  styleUrl: './search-results.scss',
})
export class SearchResults {
  protected readonly search = inject(CardSearchStore);
  protected readonly deck = inject(DeckStore);
  protected readonly auth = inject(AuthSession);
  private readonly overlay = inject(AcOverlayService);
  protected readonly favorites = inject(FavoritesService);
  /** Editor: a card's plain print stands for all its prints, a copy added takes its default alt art. */
  private readonly altArts = inject(EditorAltArts, { optional: true });
  readonly layout = input<'grid' | 'list'>('grid');
  /** Card browser: cards without quantity controls. */
  readonly browse = input(false);
  protected readonly accountTab = computed(() => isAccountSource(this.search.source()));
  protected readonly skeletons = computed(() => Array.from({ length: this.search.cards().length ? 3 : 6 }));

  constructor() {
    // The families of the results: the copies a card counts and the print an added copy takes.
    effect(() => {
      const cards = this.search.cards();
      if (!this.browse() && this.altArts?.enabled()) untracked(() => this.altArts?.request(cards.map((c) => c.reference)));
    });
  }

  /** Copies in the deck: the whole family for a plain print, that print otherwise. */
  protected quantityOf(card: Card): number {
    if (this.altArts?.isFamilyCard(card)) return this.altArts.familyQuantity(card);
    return this.deck.quantities().get(card.reference) ?? 0;
  }

  protected maxOf(card: Card): number {
    return this.altArts ? this.altArts.maxFor(card, true) : this.deck.maxFor(card);
  }

  protected setQuantity(card: Card, quantity: number): void {
    if (this.altArts) this.altArts.setQuantity(card, quantity);
    else this.deck.setQuantity(card, quantity);
  }

  /** Why a card cannot be added in the deck's format (a Unique in a No Unique format). */
  protected blockedReason(card: Card): string | null {
    return addBlockedReason(card, this.deck.format());
  }

  /** A result's visual: the card large, with its copies in the deck (the site's deck builder lightbox); the card alone in the browser. */
  protected zoom(card: Card): void {
    const editable = !this.browse() && this.deck.editable() && !this.blockedReason(card);
    openCardZoom(this.overlay, {
      card,
      quantity: editable ? { value: this.quantityOf(card), max: this.maxOf(card), change: (n) => this.setQuantity(card, n) } : undefined,
    });
  }

}
