import { CdkDrag, CdkDragPlaceholder, CdkDropList, CdkDropListGroup, type CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { uiLocale } from '../../../core/i18n';
import { contentLocale } from '../../../core/locale';
import { localizedText } from '../../../core/models';
import type { HydratedLine } from '../../../core/models';
import {
  HAND_SIZE,
  STARTING_MANA,
  commitMana,
  drawCard,
  handPool,
  handSummary,
  moveCard,
  newGame,
  shuffled,
  toggleManaPick,
  type DrawnCard,
  type PlayState,
  type PlayZone,
} from '../../../core/test-hand';
import { ArButton } from '../../../ui/buttons';
import { ArIcon } from '../../../ui/icon';
import { ArCardTile } from '../../../ui/metier';
import { ArOverlayService } from '../../../ui/overlay';
import { openCardZoom } from '../../shared/card-zoom/card-zoom.overlay';
import { PlayActionsSheet, type PlayAction } from '../play-actions/play-actions.sheet';
import { openPlayZone } from '../play-zone/play-zone.overlay';

/**
 * « Main de départ » tab: a shuffled opening hand of 6, a new hand, one more card from the deck (the site's hand
 * tester). « Mode jeu » adds its playground: 3 cards of the hand to mana, then draw, play to the board, discard, by
 * drag and drop or from a card's menu.
 */
@Component({
  selector: 'app-test-hand',
  imports: [ArButton, ArCardTile, ArIcon, CdkDropListGroup, CdkDropList, CdkDrag, CdkDragPlaceholder],
  templateUrl: './test-hand.html',
  styleUrl: './test-hand.scss',
})
export class TestHand {
  private readonly overlay = inject(ArOverlayService);
  readonly lines = input.required<HydratedLine[]>();
  /** Draw order: indexes into `pool`. Kept by index so late card data (unique faces) shows in the hand. */
  private readonly order = signal<number[]>([]);
  private readonly drawn = signal(0);

  private readonly pool = computed(() => handPool(this.lines()));
  protected readonly hand = computed(() => {
    const pool = this.pool();
    const ids = this.game()?.hand ?? this.order().slice(0, this.drawn());
    return ids.map((i) => pool[i]).filter((c) => !!c);
  });
  protected readonly remaining = computed(() => this.game()?.deck.length ?? Math.max(0, this.pool().length - this.drawn()));
  protected readonly summary = computed(() => handSummary(this.hand()));
  protected readonly averageCost = computed(() => this.summary().averageCost?.toLocaleString(uiLocale(), { maximumFractionDigits: 1 }) ?? '—');

  /** « Mode jeu »: the playground state, `null` when off. */
  protected readonly game = signal<PlayState | null>(null);
  protected readonly board = computed(() => this.cardsOf(this.game()?.board));
  protected readonly discard = computed(() => this.cardsOf(this.game()?.discard));
  protected readonly topDiscard = computed(() => this.discard().at(-1) ?? null);
  protected readonly manaCount = computed(() => this.game()?.mana.length ?? 0);
  protected readonly picked = computed(() => new Set(this.game()?.manaPick ?? []));
  protected readonly setup = computed(() => this.game()?.phase === 'setup');
  protected readonly startingMana = STARTING_MANA;
  /** Drop lists' data (a typed zone, not a template string). */
  protected readonly zones: Record<PlayZone, PlayZone> = { hand: 'hand', mana: 'mana', board: 'board', discard: 'discard' };
  protected readonly labels = {
    mana: $localize`:@@deck.play.manaList:Cartes en mana`,
    discard: $localize`:@@deck.play.discardList:Défausse`,
    actions: $localize`:@@deck.play.actions:Actions`,
  };

  constructor() {
    // New deck contents (loaded, or another deck): deal again.
    effect(() => {
      const size = this.pool().length;
      untracked(() => (size ? this.newHand() : this.order.set([])));
    });
  }

  newHand(): void {
    const size = this.pool().length;
    this.order.set(shuffled([...Array(size).keys()]));
    this.drawn.set(Math.min(HAND_SIZE, size));
    if (this.game()) this.game.set(newGame(this.order()));
  }

  draw(): void {
    const game = this.game();
    if (game) this.game.set(drawCard(game));
    else if (this.remaining() > 0) this.drawn.update((n) => n + 1);
  }

  /** On: a new game from a new hand (the site's toggle). Off: back to the plain hand. */
  protected toggleGame(): void {
    if (this.game()) {
      this.game.set(null);
      return;
    }
    this.game.set(newGame([]));
    this.newHand();
  }

  protected commitMana(): void {
    const game = this.game();
    if (game) this.game.set(commitMana(game));
  }

  /** A card of the hand or the board: setup, picks it for mana; play, opens its menu. */
  protected cardClick(card: DrawnCard, zone: PlayZone): void {
    const game = this.game();
    if (!game) return;
    if (game.phase === 'setup') {
      if (zone === 'hand') this.game.set(toggleManaPick(game, card.id));
      return;
    }
    this.overlay
      .open<PlayActionsSheet, PlayAction, { zone: PlayZone }>(PlayActionsSheet, { title: this.labels.actions, width: 360, data: { zone } })
      .afterClosed.subscribe((action) => {
        if (action === 'zoom') openCardZoom(this.overlay, { card: card.card });
        else if (action) this.move(card.id, action);
      });
  }

  protected drop(event: CdkDragDrop<PlayZone, PlayZone, number>): void {
    // The discard pile shows its top card only: a dropped card goes on top.
    const to = event.container.data;
    this.move(event.item.data, to, to === 'discard' ? undefined : event.currentIndex);
  }

  protected showMana(): void {
    openPlayZone(this.overlay, this.labels.mana, { cards: this.cardsOf(this.game()?.mana) });
  }

  protected showDiscard(): void {
    openPlayZone(this.overlay, this.labels.discard, { cards: this.discard(), returnToHand: (id) => this.move(id, 'hand') });
  }

  protected cardLabel(c: DrawnCard): string {
    const name = localizedText(c.card.name, contentLocale()) || c.card.reference;
    return this.setup() ? $localize`:@@deck.play.pickLabel:${name}:name: : mettre en mana` : $localize`:@@deck.play.cardLabel:${name}:name: : actions`;
  }

  /** A long press starts a drag on touch screens, so a swipe over the cards still scrolls the page. */
  protected readonly dragDelay = { touch: 300, mouse: 0 };

  /** Drag and drop only once the game is on (setup: taps pick the mana). */
  protected readonly dragLocked = computed(() => this.game()?.phase !== 'play');

  private move(id: number, to: PlayZone, index?: number): void {
    const game = this.game();
    if (game) this.game.set(moveCard(game, id, to, index));
  }

  private cardsOf(ids: number[] | undefined): DrawnCard[] {
    const pool = this.pool();
    return (ids ?? []).map((i) => pool[i]).filter((c) => !!c);
  }
}
