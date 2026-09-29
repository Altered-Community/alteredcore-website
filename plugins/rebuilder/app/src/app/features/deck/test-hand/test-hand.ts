import { Component, computed, effect, input, signal, untracked } from '@angular/core';
import { uiLocale } from '../../../core/i18n';
import type { HydratedLine } from '../../../core/models';
import { HAND_SIZE, handPool, handSummary, shuffled } from '../../../core/test-hand';
import { ArButton } from '../../../ui/buttons';
import { ArCardTile } from '../../../ui/metier';

/**
 * « Main de départ » tab: a shuffled opening hand of 6, a new hand, one more card from the deck
 * (the site's hand tester, without its game mode).
 */
@Component({
  selector: 'app-test-hand',
  imports: [ArButton, ArCardTile],
  templateUrl: './test-hand.html',
  styleUrl: './test-hand.scss',
})
export class TestHand {
  readonly lines = input.required<HydratedLine[]>();
  /** Draw order: indexes into `pool`. Kept by index so late card data (unique faces) shows in the hand. */
  private readonly order = signal<number[]>([]);
  private readonly drawn = signal(0);

  private readonly pool = computed(() => handPool(this.lines()));
  protected readonly hand = computed(() => {
    const pool = this.pool();
    return this.order()
      .slice(0, this.drawn())
      .map((i) => pool[i])
      .filter((c) => !!c);
  });
  protected readonly remaining = computed(() => Math.max(0, this.pool().length - this.drawn()));
  protected readonly summary = computed(() => handSummary(this.hand()));
  protected readonly averageCost = computed(() => this.summary().averageCost?.toLocaleString(uiLocale(), { maximumFractionDigits: 1 }) ?? '—');

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
  }

  draw(): void {
    if (this.remaining() > 0) this.drawn.update((n) => n + 1);
  }
}
