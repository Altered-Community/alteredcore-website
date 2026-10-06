import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { DeckStore } from '../../../core/deck-store';
import type { Card, HydratedLine } from '../../../core/models';
import { AcCardPile } from '../../../ui/metier';
import { AcOverlayService } from '../../../ui/overlay';
import { EditorAltArts } from '../../editor/editor-alt-arts';
import { lineIssues } from '../../editor/editor-legality';
import { openCardZoom } from '../../shared/card-zoom/card-zoom.overlay';
import { deckBoard } from './board-layout';

/**
 * « Aperçu » from 768 px: the whole deck at a glance, as its image. One column group per type, each card a pile of its
 * copies. Editable (editor): a stepper on each pile; a card brought to 0 keeps its place, faded, until the view is left.
 */
@Component({
  selector: 'app-deck-board',
  imports: [AcCardPile],
  templateUrl: './deck-board.html',
  styleUrl: './deck-board.scss',
})
export class DeckBoard {
  protected readonly deck = inject(DeckStore);
  private readonly overlay = inject(AcOverlayService);
  /** Editor only: prints of the deck's cards (per-deck alt-art mode). */
  private readonly altArts = inject(EditorAltArts, { optional: true });
  readonly readonly = input(false);

  protected readonly editable = computed(() => !this.readonly() && this.deck.editable());
  /** Cards shown since this view opened, by reference: one removed meanwhile stays at 0 copies. */
  private readonly shown = signal(new Map<string, Card>());
  protected readonly groups = computed(() => {
    const lines: HydratedLine[] = this.deck.lines().filter((l) => l.quantity > 0);
    const present = new Set(lines.map((l) => l.card.reference));
    if (this.editable()) {
      for (const [ref, card] of this.shown()) if (!present.has(ref)) lines.push({ card, quantity: 0 });
    }
    return deckBoard(lines);
  });
  protected readonly issues = computed(() => lineIssues(this.deck));
  protected readonly noIssues: readonly string[] = [];

  constructor() {
    // Another deck loaded: its own cards only.
    effect(() => {
      this.deck.deckId();
      untracked(() => this.shown.set(new Map()));
    });
    effect(() => {
      const lines = this.deck.lines();
      untracked(() => {
        const next = new Map(this.shown());
        let changed = false;
        for (const l of lines) {
          if (l.quantity > 0 && next.get(l.card.reference) !== l.card) {
            next.set(l.card.reference, l.card);
            changed = true;
          }
        }
        if (changed) this.shown.set(next);
      });
    });
  }

  protected quantityOf(card: Card): number {
    return this.deck.quantities().get(card.reference) ?? 0;
  }

  /** The card large, with its copies and prints when the deck can be edited (the site's card lightbox). */
  protected zoom(card: Card): void {
    const editable = this.editable();
    const choice = this.altArts?.choiceFor(card.reference) ?? null;
    openCardZoom(this.overlay, {
      card,
      quantity: editable ? { value: this.quantityOf(card), max: this.deck.maxFor(card), change: (n) => this.deck.setQuantity(card, n) } : undefined,
      illustrations: editable && choice ? { choice, pick: (ref) => this.deck.swapReference(card, ref) } : undefined,
    });
  }
}
