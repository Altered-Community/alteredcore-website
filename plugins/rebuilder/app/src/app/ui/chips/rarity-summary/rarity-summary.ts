import { Component, input } from '@angular/core';
import type { RarityCounts } from '../../../core/deck-rules';
import { RARITY_ICONS } from '../rarity';

/** C / R / U / E counters; never wraps inside, wraps as a whole. */
@Component({
  selector: 'ac-rarity-summary',
  host: { '[style.gap.px]': 'gap()', role: 'group', '[attr.aria-label]': 'ariaLabel' },
  templateUrl: './rarity-summary.html',
  styleUrl: './rarity-summary.scss',
})
export class AcRaritySummary {
  readonly counts = input.required<RarityCounts>();
  readonly gap = input(8);
  protected readonly icons = RARITY_ICONS;
  protected readonly ariaLabel = $localize`:@@ui.raritySummary.label:Répartition par rareté`;
}
