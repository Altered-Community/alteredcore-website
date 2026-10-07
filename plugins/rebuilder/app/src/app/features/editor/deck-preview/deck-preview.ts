import { Component, computed, inject, input, signal } from '@angular/core';
import { DeckStore } from '../../../core/deck-store';
import { AcButton } from '../../../ui/buttons';
import { AcSkeleton } from '../../../ui/containers';
import { AcCardTile, AcDeckSection } from '../../../ui/metier';
import { AcOverlayService } from '../../../ui/overlay';
import { FavoritesService } from '../../../core/favorites.service';
import { EditorAltArts } from '../editor-alt-arts';
import type { Card } from '../../../core/models';
import { openCardZoom } from '../../shared/card-zoom/card-zoom.overlay';

/** « Aperçu » / « Cartes »: count line, « Tout replier », one section per type with tiles. */
@Component({
  selector: 'app-deck-preview',
  imports: [AcDeckSection, AcCardTile, AcButton, AcSkeleton],
  templateUrl: './deck-preview.html',
  styleUrl: './deck-preview.scss',
})
export class DeckPreview {
  protected readonly deck = inject(DeckStore);
  private readonly overlay = inject(AcOverlayService);
  protected readonly favorites = inject(FavoritesService);
  /** Editor only: prints of the deck's cards (per-deck alt-art mode). */
  private readonly altArts = inject(EditorAltArts, { optional: true });
  readonly readonly = input(false);
  /** Three columns on compact (consultation « Cartes »). */
  readonly dense = input(false);
  protected readonly labels = {
    expandAll: $localize`:@@editor.preview.expandAll:Tout déplier`,
    collapseAll: $localize`:@@editor.preview.collapseAll:Tout replier`,
  };
  protected readonly closed = signal(new Set<string>());
  protected readonly allClosed = computed(() => this.deck.groups().length > 0 && this.deck.groups().every((g) => this.closed().has(g.id)));

  setOpen(id: string, open: boolean): void {
    this.closed.update((s) => {
      const next = new Set(s);
      if (open) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** A tile's visual: the card large, with its copies when the deck can be edited (the site's card lightbox). */
  protected zoom(card: Card): void {
    const editable = !this.readonly() && this.deck.editable();
    const choice = this.altArts?.choiceFor(card.reference) ?? null;
    openCardZoom(this.overlay, {
      card,
      quantity: editable ? { value: this.deck.quantities().get(card.reference) ?? 0, max: this.deck.maxFor(card), change: (n) => this.deck.setQuantity(card, n) } : undefined,
      illustrations: editable && choice ? { choice, pick: (ref) => this.deck.swapReference(card, ref) } : undefined,
    });
  }

  toggleAll(): void {
    this.closed.set(this.allClosed() ? new Set() : new Set(this.deck.groups().map((g) => g.id)));
  }
}
