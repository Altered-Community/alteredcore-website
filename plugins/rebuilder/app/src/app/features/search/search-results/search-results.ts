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
  /** Editor: illustrations (default alt arts, « Arts alternatifs »). */
  private readonly altArts = inject(EditorAltArts, { optional: true });
  readonly layout = input<'grid' | 'list'>('grid');
  /** Card browser: cards without quantity controls. */
  readonly browse = input(false);
  protected readonly accountTab = computed(() => isAccountSource(this.search.source()));
  protected readonly skeletons = computed(() => Array.from({ length: this.search.cards().length ? 3 : 6 }));
  /** « Arts alternatifs » on: cards added as shown; off: a card's plain print stands for all its prints. */
  private readonly prints = computed(() => !this.browse() && !!this.altArts?.enabled() && this.altArts.searchPrints());
  /** The results, with the owned alt arts after their card when « Arts alternatifs » is on. */
  private readonly shown = computed(() => (this.prints() && this.altArts ? this.altArts.withOwnedPrints(this.search.cards()) : { cards: this.search.cards(), notes: new Map<string, string>() }));
  protected readonly cards = computed(() => this.shown().cards);

  constructor() {
    // The families of the results: the copies a card counts and the alt arts the player owns.
    effect(() => {
      const cards = this.search.cards();
      if (!this.browse() && this.altArts?.enabled()) untracked(() => this.altArts?.request(cards.map((c) => c.reference)));
    });
  }

  protected noteOf(card: Card): string | null {
    return this.shown().notes.get(card.reference) ?? null;
  }

  /** Copies in the deck: the whole family for a plain print with « Arts alternatifs » off, that print otherwise. */
  protected quantityOf(card: Card): number {
    if (this.altArts && !this.prints() && this.altArts.isFamilyCard(card)) return this.altArts.familyQuantity(card);
    return this.deck.quantities().get(card.reference) ?? 0;
  }

  protected maxOf(card: Card): number {
    return this.altArts ? this.altArts.maxFor(card, !this.prints()) : this.deck.maxFor(card);
  }

  protected setQuantity(card: Card, quantity: number): void {
    if (this.altArts) this.altArts.setQuantity(card, quantity, !this.prints());
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
