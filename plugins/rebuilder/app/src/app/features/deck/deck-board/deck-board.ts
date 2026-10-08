import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, signal } from '@angular/core';
import { DeckStore, displayName } from '../../../core/deck-store';
import type { Card } from '../../../core/models';
import { AcCardPile } from '../../../ui/metier';
import { AcSkeleton } from '../../../ui/containers';
import { AcOverlayService } from '../../../ui/overlay';
import { EditorAltArts } from '../../editor/editor-alt-arts';
import { lineIssues } from '../../editor/editor-legality';
import { openCardZoom } from '../../shared/card-zoom/card-zoom.overlay';
import { openAltArtPicker } from '../../editor/alt-art-picker/alt-art-picker.overlay';
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
 * copies. Editable (editor): a stepper on each pile; a card brought to 0 leaves the board (« Annuler » in the toast).
 */
@Component({
  selector: 'app-deck-board',
  imports: [AcCardPile, AcSkeleton],
  templateUrl: './deck-board.html',
  styleUrl: './deck-board.scss',
})
export class DeckBoard {
  protected readonly deck = inject(DeckStore);
  private readonly overlay = inject(AcOverlayService);
  /** Editor only: prints of the deck's cards (per-deck alt-art mode). */
  protected readonly altArts = inject(EditorAltArts, { optional: true });
  readonly readonly = input(false);
  /** The board's width, measured: the number of card columns follows it. */
  private readonly width = signal(0);

  protected readonly editable = computed(() => !this.readonly() && this.deck.editable());
  /** The groups, sorted: recomputed when the cards change, not when the board is resized. */
  private readonly board = computed(() => boardGroups(this.deck.lines().filter((l) => l.quantity > 0)));
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
  }

  protected setQuantity(card: Card, quantity: number): void {
    this.deck.setQuantity(card, quantity);
  }

  protected quantityOf(card: Card): number {
    return this.deck.quantities().get(card.reference) ?? 0;
  }

  /** `card` has a brush (several illustrations, the deck editable). */
  protected canIllustrate(card: Card): boolean {
    return this.editable() && !!this.altArts?.canIllustrate(card);
  }

  /** The brush of a card: its illustrations in this deck. */
  protected illustrate(card: Card): void {
    const data = this.altArts?.pickerFor(card);
    if (data) openAltArtPicker(this.overlay, displayName(card), data);
  }

  /** The card large, with its copies and prints when the deck can be edited (the site's card lightbox). */
  protected zoom(card: Card): void {
    const editable = this.editable();
    openCardZoom(this.overlay, {
      card,
      quantity: editable ? { value: this.quantityOf(card), max: this.deck.maxFor(card), change: (n) => this.setQuantity(card, n) } : undefined,
      illustrations: editable ? (this.altArts?.pickerFor(card) ?? undefined) : undefined,
    });
  }
}
