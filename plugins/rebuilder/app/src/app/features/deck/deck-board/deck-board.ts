import { Component, DestroyRef, ElementRef, afterNextRender, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { DeckStore } from '../../../core/deck-store';
import type { Card, HydratedLine } from '../../../core/models';
import { AcCardPile } from '../../../ui/metier';
import { AcOverlayService } from '../../../ui/overlay';
import { EditorAltArts } from '../../editor/editor-alt-arts';
import { lineIssues } from '../../editor/editor-legality';
import { openCardZoom } from '../../shared/card-zoom/card-zoom.overlay';
import { boardGroups, fitColumns, layoutBoard } from './board-layout';

/** Narrowest card the board shows, to keep it readable: a wider board gets more columns, so fewer rows. */
const MIN_CARD = 150;
/** The board's CSS: a group's side padding (--ac-space-5) and the gap between cards (--ac-space-3). */
const PADDING = 20;
const GAP = 12;
/** Columns before the board is measured. */
const DEFAULT_COLUMNS = 8;

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
  /** The board's width, measured: the number of card columns follows it. */
  private readonly width = signal(0);

  protected readonly editable = computed(() => !this.readonly() && this.deck.editable());
  /** Cards brought to 0 with a pile's stepper since this view opened, by reference: they keep their place, faded. */
  private readonly removed = signal(new Map<string, Card>());
  /** The groups, sorted: recomputed when the cards change, not when the board is resized. */
  private readonly board = computed(() => {
    const lines: HydratedLine[] = this.deck.lines().filter((l) => l.quantity > 0);
    const present = new Set(lines.map((l) => l.card.reference));
    if (this.editable()) {
      for (const [ref, card] of this.removed()) if (!present.has(ref)) lines.push({ card, quantity: 0 });
    }
    return boardGroups(lines);
  });
  /** Card columns the width allows: a number, so a resize that keeps it changes nothing downstream. */
  private readonly columns = computed(() => {
    const width = this.width();
    return width ? fitColumns(width, this.board().length, MIN_CARD, PADDING, GAP) : DEFAULT_COLUMNS;
  });
  protected readonly groups = computed(() => layoutBoard(this.board(), this.columns()));
  protected readonly issues = computed(() => lineIssues(this.deck));
  protected readonly noIssues: readonly string[] = [];

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(([entry]) => this.width.set(Math.round(entry.contentRect.width)));
      observer.observe(host);
      destroyRef.onDestroy(() => observer.disconnect());
    });
    // Another deck loaded: its own cards only.
    effect(() => {
      this.deck.deckId();
      untracked(() => this.removed.set(new Map()));
    });
  }

  /**
   * A pile's stepper. Only a card removed here stays on the board at 0: a reference that leaves the deck otherwise (an
   * illustration swapped in the zoom, the preferred prints of Global mode) leaves no faded pile behind.
   */
  protected setQuantity(card: Card, quantity: number): void {
    this.deck.setQuantity(card, quantity);
    this.removed.update((map) => {
      const next = new Map(map);
      if (quantity === 0) next.set(card.reference, card);
      else next.delete(card.reference);
      return next;
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
      quantity: editable ? { value: this.quantityOf(card), max: this.deck.maxFor(card), change: (n) => this.setQuantity(card, n) } : undefined,
      illustrations: editable && choice ? { choice, pick: (ref) => this.deck.swapReference(card, ref) } : undefined,
    });
  }
}
