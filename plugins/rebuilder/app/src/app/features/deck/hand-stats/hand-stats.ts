import { Component, computed, input } from '@angular/core';
import { formatPercent, formatPrecisePercent, handStats, oddsCards } from '../../../core/hand-odds';
import { uiLocale } from '../../../core/i18n';
import type { HydratedLine } from '../../../core/models';
import { HAND_SIZE } from '../../../core/test-hand';
import { AcCardSurface, AcCollapsible } from '../../../ui/containers';
import { AcDonutChart, AcProbabilityBars, type AcDonutSegment, type AcProbabilityBar } from '../../../ui/metier';

/** A headline figure: rounded, two decimals on hover. */
interface Figure {
  text: string;
  precise: string;
}

/**
 * « Stats de main de départ »: average composition and the odds of an opening hand of 6
 * (mana used on day 1, expensive cards, plays chained, contestable Expeditions), as on the site.
 */
@Component({
  selector: 'app-hand-stats',
  imports: [AcCardSurface, AcCollapsible, AcDonutChart, AcProbabilityBars],
  templateUrl: './hand-stats.html',
  styleUrl: './hand-stats.scss',
})
export class HandStats {
  readonly lines = input.required<HydratedLine[]>();

  private readonly cards = computed(() => oddsCards(this.lines()));
  private readonly stats = computed(() => handStats(this.cards(), HAND_SIZE));

  protected readonly composition = computed<AcDonutSegment[]>(() => {
    const t = { character: 0, spell: 0, permanent: 0 };
    let total = 0;
    for (const l of this.lines()) {
      const type = (l.card.cardType?.reference ?? '').toUpperCase();
      if (type === 'HERO' || l.quantity <= 0) continue;
      t[type === 'CHARACTER' ? 'character' : type === 'SPELL' ? 'spell' : 'permanent'] += l.quantity;
      total += l.quantity;
    }
    const perHand = (qty: number) =>
      (total ? (HAND_SIZE * qty) / total : 0).toLocaleString(uiLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return [
      { key: 'character', tone: 'character', label: $localize`:@@deck.handStats.character:Personnage`, value: t.character, display: perHand(t.character) },
      { key: 'spell', tone: 'spell', label: $localize`:@@deck.handStats.spell:Sort`, value: t.spell, display: perHand(t.spell) },
      { key: 'permanent', tone: 'permanent', label: $localize`:@@deck.handStats.permanent:Permanent`, value: t.permanent, display: perHand(t.permanent) },
    ];
  });

  protected readonly figures = computed(() => {
    const s = this.stats();
    return {
      heavy: this.figure(s.heavy),
      tempo: this.figure(s.tempo),
      optimal: this.figure(s.manaSpent[3]),
      dead: this.figure(s.manaSpent[0]),
      both: this.figure(s.expeditions[2]),
      none: this.figure(s.expeditions[0]),
    };
  });

  protected readonly manaBars = computed<AcProbabilityBar[]>(() => {
    const m = this.stats().manaSpent;
    return [3, 2, 1, 0].map((k) => ({ key: `${k}`, label: $localize`:@@deck.handStats.mana:${k}:count: mana`, p: m[k], warn: k === 0 }));
  });

  protected readonly expensiveBars = computed<AcProbabilityBar[]>(() =>
    this.stats().expensive.map((p, k) => ({
      key: `${k}`,
      label: k === 1 ? $localize`:@@deck.handStats.cardOne:${k}:count: carte` : $localize`:@@deck.handStats.cards:${k}:count: cartes`,
      p,
      warn: k >= 3,
    })),
  );

  protected readonly playBars = computed<AcProbabilityBar[]>(() =>
    this.stats().plays.map((p, k) => ({
      key: `${k}`,
      label: k === 1 ? $localize`:@@deck.handStats.playOne:${k}:count: play` : $localize`:@@deck.handStats.plays:${k}:count: plays`,
      p,
      warn: k === 0,
    })),
  );

  protected readonly expeditionBars = computed<AcProbabilityBar[]>(() => {
    const x = this.stats().expeditions;
    return [
      { key: 'none', label: $localize`:@@deck.handStats.expNone:Aucun personnage`, p: x[0] },
      { key: 'one', label: $localize`:@@deck.handStats.expOne:1 Expédition`, p: x[1] },
      { key: 'both', label: $localize`:@@deck.handStats.expBoth:Les 2 Expéditions`, p: x[2] },
    ];
  });

  private figure(p: number): Figure {
    return { text: formatPercent(p, uiLocale()), precise: formatPrecisePercent(p, uiLocale()) };
  }
}
