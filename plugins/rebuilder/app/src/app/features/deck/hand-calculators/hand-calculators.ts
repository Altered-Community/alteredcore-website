import { Component, computed, input, signal } from '@angular/core';
import { bestFraction, oddsGroups, pAtLeast, pAtLeastOne, pComboBoth, type OddsGroup } from '../../../core/hand-odds';
import type { HydratedLine } from '../../../core/models';
import { cardImageSources } from '../../../core/card-art';
import { GROUP_LABELS, groupIdOfType } from '../../../core/deck-view';
import { HAND_SIZE } from '../../../core/test-hand';
import { AcCardSurface } from '../../../ui/containers';
import { AcCombobox, AcInput, type ComboOption } from '../../../ui/fields';
import { AcIcon } from '../../../ui/icon';
import { AcProbabilityBars, type AcProbabilityBar } from '../../../ui/metier';

/**
 * « Calculateurs »: odds of drawing chosen cards among n (1 to the deck size, 6 by default),
 * and of a two-card combo, as on the site.
 */
@Component({
  selector: 'app-hand-calculators',
  imports: [AcCardSurface, AcCombobox, AcInput, AcIcon, AcProbabilityBars],
  templateUrl: './hand-calculators.html',
  styleUrl: './hand-calculators.scss',
})
export class HandCalculators {
  readonly lines = input.required<HydratedLine[]>();

  private readonly groups = computed(() => oddsGroups(this.lines()));
  protected readonly deckSize = computed(() => this.groups().reduce((n, g) => n + g.qty, 0));
  /** Card thumbnails, grouped by type (the site's calculators list). */
  protected readonly options = computed<ComboOption[]>(() =>
    this.groups().map((g) => ({ id: g.id, text: optionText(g), thumb: cardImageSources(g.reference)[0], group: GROUP_LABELS[groupIdOfType(g.type)].label })),
  );

  protected readonly drawnInput = signal(String(HAND_SIZE));
  protected readonly drawn = computed(() => {
    const n = Number.parseInt(this.drawnInput(), 10) || HAND_SIZE;
    return Math.max(1, Math.min(n, this.deckSize() || HAND_SIZE));
  });

  protected readonly cards = signal<ComboOption[]>([]);
  protected readonly groupA = signal<ComboOption[]>([]);
  protected readonly groupB = signal<ComboOption[]>([]);

  protected readonly cardBars = computed<AcProbabilityBar[]>(() => {
    const K = this.copies(this.cards());
    const N = this.deckSize();
    const n = this.drawn();
    const at = (t: number) => (K ? pAtLeast(N, K, n, t) : null);
    return [
      { key: '0', label: '0', p: K ? 1 - pAtLeastOne(N, K, n) : null },
      { key: '1', label: '1+', p: at(1) },
      { key: '2', label: '2+', p: at(2) },
      { key: '3', label: '3+', p: at(3) },
    ];
  });
  protected readonly cardRatio = computed(() => {
    const K = this.copies(this.cards());
    return K ? this.ratioText(pAtLeast(this.deckSize(), K, this.drawn(), 1)) : '';
  });

  /** A combo needs two different cards: B drops what A already holds (A and B stay disjoint). */
  private readonly comboCopies = computed(() => {
    const a = this.groupA();
    const inA = new Set(a.map((o) => o.id));
    return { a: this.copies(a), b: this.copies(this.groupB().filter((o) => !inA.has(o.id))) };
  });
  protected readonly comboBars = computed<AcProbabilityBar[]>(() => {
    const { a, b } = this.comboCopies();
    const N = this.deckSize();
    const n = this.drawn();
    return [
      { key: 'a', label: 'A', p: a ? pAtLeastOne(N, a, n) : null },
      { key: 'b', label: 'B', p: b ? pAtLeastOne(N, b, n) : null },
      { key: 'ab', label: 'A + B', p: a && b ? pComboBoth(N, a, b, n) : null },
    ];
  });
  protected readonly comboRatio = computed(() => {
    const { a, b } = this.comboCopies();
    return a && b ? this.ratioText(pComboBoth(this.deckSize(), a, b, this.drawn())) : '';
  });

  private copies(picked: ComboOption[]): number {
    const byId = new Map(this.groups().map((g) => [g.id, g.qty]));
    return picked.reduce((n, o) => n + (byId.get(o.id) ?? 0), 0);
  }

  /** « ≈ 3 sur 4 mains » (6 cards drawn), « ≈ 3 chances sur 4 » otherwise. */
  private ratioText(p: number): string {
    const f = bestFraction(p);
    if (!f) return '';
    return this.drawn() === HAND_SIZE
      ? $localize`:@@deck.calc.ratioHands:≈ ${f.x}:x: sur ${f.y}:y: mains`
      : $localize`:@@deck.calc.ratio:≈ ${f.x}:x: chances sur ${f.y}:y:`;
  }
}

/** « Fée Clochette C ×3 »; a unique shows its costs instead (each unique is a card of its own). */
function optionText(g: OddsGroup): string {
  return `${g.name} ${g.rarity} ${g.unique ? `${g.mainCost}/${g.recallCost}` : `×${g.qty}`}`;
}
