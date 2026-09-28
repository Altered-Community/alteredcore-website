import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { RarityCounts } from '../../../core/deck-rules';
import { RARITY_ICONS } from '../rarity';

/** C / R / U / E counters; never wraps inside, wraps as a whole. */
@Component({
  selector: 'ar-rarity-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style.gap.px]': 'gap()', role: 'group', 'aria-label': 'Répartition par rareté' },
  templateUrl: './rarity-summary.html',
  styleUrl: './rarity-summary.scss',
})
export class ArRaritySummary {
  readonly counts = input.required<RarityCounts>();
  readonly gap = input(8);
  protected readonly icons = RARITY_ICONS;
}
