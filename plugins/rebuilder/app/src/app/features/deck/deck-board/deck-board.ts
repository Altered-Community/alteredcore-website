import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, signal } from '@angular/core';
import { DeckStore, displayName } from '../../../core/deck-store';
import type { Card, HydratedLine } from '../../../core/models';
import { familyKey } from '../../../core/ownership-api.service';
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
 * « Regrouper les illustrations » (editor): the prints of a card share one pile, copy 1 of its brush in front, and the
 * pile's stepper adds and removes copies of the card as the search does.
 */

/** A pile of a card's prints: its copies (copy 1 first), its family, its legality issues. */
interface Stack {
  key: string;
  prints: string[];
  issues: readonly string[];
}
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
  protected readonly issues = computed(() => lineIssues(this.deck));
  protected readonly noIssues: readonly string[] = [];
  /** The board's lines, a card's prints on one pile when « Regrouper les illustrations » is on, and those piles. */
  private readonly piles = computed(() => {
    const lines = this.deck.lines().filter((l) => l.quantity > 0);
    const stacks = new Map<string, Stack>();
    const alt = this.altArts;
    if (!alt || !this.editable() || !alt.stackPrints()) return { lines, stacks };
    const issues = this.issues();
    const out: HydratedLine[] = [];
    const done = new Set<string>();
    for (const line of lines) {
      const choice = alt.choiceFor(line.card.reference);
      const members = choice ? alt.members(choice) : null;
      if (!choice || !members || members.size < 2) {
        out.push(line);
        continue;
      }
      const key = familyKey(choice.family);
      if (done.has(key)) continue;
      done.add(key);
      const prints = alt.copyPrints(line.card) ?? [];
      const front = lines.find((l) => l.card.reference === prints[0])?.card ?? line.card;
      out.push({ card: front, quantity: prints.length });
      stacks.set(front.reference, { key, prints, issues: [...new Set([...members].flatMap((r) => issues.get(r) ?? []))] });
    }
    return { lines: out, stacks };
  });
  protected readonly stacks = computed(() => this.piles().stacks);
  /** The groups, sorted: recomputed when the cards change, not when the board is resized. */
  private readonly board = computed(() => boardGroups(this.piles().lines));
  /** Card columns the width allows: a number, so a resize that keeps it changes nothing downstream. */
  private readonly columns = computed(() => {
    const width = this.width();
    return width ? fitColumns(width, this.board().length, MIN_CARD, PADDING, GAP) : DEFAULT_COLUMNS;
  });
  protected readonly groups = computed(() => layoutBoard(this.board(), this.columns()));

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

  /** A pile keeps its place while its front print changes. */
  protected trackOf(line: HydratedLine): string {
    return this.stacks().get(line.card.reference)?.key ?? line.card.reference;
  }

  /** A pile's copies: of the card's whole family on a pile of its prints. */
  protected setQuantity(card: Card, quantity: number): void {
    if (this.altArts && this.stacks().has(card.reference)) this.altArts.setFamilyQuantity(card, quantity);
    else this.deck.setQuantity(card, quantity);
  }

  protected quantityOf(card: Card): number {
    return this.stacks().get(card.reference)?.prints.length ?? this.deck.quantities().get(card.reference) ?? 0;
  }

  /** Copies a pile can have: the card's limit on a pile of its prints, shared with its other prints otherwise. */
  protected maxOf(card: Card): number {
    return this.stacks().has(card.reference) ? this.deck.maxFor(card) : (this.altArts?.maxFor(card, false) ?? this.deck.maxFor(card));
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
      quantity: editable ? { value: this.quantityOf(card), max: this.maxOf(card), change: (n) => this.setQuantity(card, n) } : undefined,
      illustrations: editable ? (this.altArts?.pickerFor(card) ?? undefined) : undefined,
    });
  }
}
