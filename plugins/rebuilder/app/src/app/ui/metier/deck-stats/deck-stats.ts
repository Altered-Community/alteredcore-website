import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ArTerrainTotals } from '../../chips';
import { ArCostChart } from '../cost-chart/cost-chart';

/** Cost charts + terrain totals (content of the Stats collapsible). */
@Component({
  selector: 'ar-deck-stats',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArCostChart, ArTerrainTotals],
  templateUrl: './deck-stats.html',
  styleUrl: './deck-stats.scss',
})
export class ArDeckStats {
  readonly main = input.required<number[]>();
  readonly reserve = input.required<number[]>();
  readonly terrain = input.required<{ foret: number; montagne: number; ocean: number }>();
}
