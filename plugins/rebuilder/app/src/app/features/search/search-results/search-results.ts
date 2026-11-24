import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { isAccountSource } from '../../../core/card-filters';
import { addBlockedReason } from '../../../core/format-rules';
import { formatInfo } from '../../../core/formats';
import { DeckStore } from '../../../core/deck-store';
import { AuthSession } from '../../../core/auth-session';
import type { Card } from '../../../core/models';
import { AcButton } from '../../../ui/buttons';
import { AcSkeleton, AcVirtualGrid } from '../../../ui/containers';
import { AcInfiniteSentinel } from '../../../ui/infinite';
import { AcCardTile, AcDeckRow } from '../../../ui/metier';
import { AcOverlayService } from '../../../ui/overlay';
import { FavoritesService } from '../../../core/favorites.service';
import { COLLECTION_MAX, CollectionService } from '../../../core/collection.service';
import { openCardZoom } from '../../shared/card-zoom/card-zoom.overlay';
import { CardSearchStore } from '../card-search.store';
import { EditorAltArts } from '../../editor/editor-alt-arts';

@Component({
  selector: 'app-search-results',
  host: { '[style.--app-card-cols]': 'columns()' },
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
  private readonly collection = inject(CollectionService);
  /** Editor: a card's plain print stands for all its prints, a copy added takes its default alt art. */
  private readonly altArts = inject(EditorAltArts, { optional: true });
  readonly layout = input<'grid' | 'list'>('grid');
  /** Card browser, signed in with the site's collection on: the copies of the physical collection on the cards. */
  protected readonly collecting = computed(() => this.browse() && this.collection.enabled());
  /** Card browser: cards without quantity controls. */
  readonly browse = input(false);
  /** Columns of the grid (from 768 px); null leaves it to the column width. */
  readonly columns = input<number | null>(null);
  /** Uniques are read, not only recognised: the grid keeps at most 7 columns. */
  readonly readable = input(false);
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
    if (this.browse()) return this.collection.quantity(card.reference);
    if (this.altArts?.isFamilyCard(card)) return this.altArts.familyQuantity(card);
    return this.deck.quantities().get(card.reference) ?? 0;
  }

  protected maxOf(card: Card): number {
    if (this.browse()) return COLLECTION_MAX;
    return this.altArts ? this.altArts.maxFor(card, true) : this.deck.maxFor(card);
  }

  protected setQuantity(card: Card, quantity: number): void {
    if (this.browse()) this.collection.set(card.reference, quantity);
    else if (this.altArts) this.altArts.setQuantity(card, quantity);
    else this.deck.setQuantity(card, quantity);
  }

  /** Why a card cannot be added in the deck's format (a Unique in a No Unique format). */
  protected blockedReason(card: Card): string | null {
    if (this.browse()) return null;
    return addBlockedReason(card, this.deck.rules(), formatInfo(this.deck.format()).label);
  }

  /** A result's visual: the card large, with its copies in the deck (the site's deck builder lightbox), or in the collection in the browser. */
  protected zoom(card: Card): void {
    const controls = (c: Card) => {
      const editable = this.browse() ? this.collecting() : this.deck.editable() && !this.blockedReason(c);
      return {
        quantity: editable
          ? { value: this.quantityOf(c), max: this.maxOf(c), change: (n: number) => this.setQuantity(c, n), in: this.browse() ? ('collection' as const) : ('deck' as const) }
          : undefined,
      };
    };
    // The results as loaded when the window opens: ← / → walk through them.
    openCardZoom(this.overlay, { card, ...controls(card), siblings: { cards: this.search.cards(), controls } });
  }

}
