import { Component, input } from '@angular/core';
import { AcTerrainTotals } from '../../chips';
import { AcCostChart } from '../cost-chart/cost-chart';

/** Cost charts + terrain totals (content of the Stats collapsible). */
@Component({
  selector: 'ac-deck-stats',
  imports: [AcCostChart, AcTerrainTotals],
  templateUrl: './deck-stats.html',
  styleUrl: './deck-stats.scss',
})
export class AcDeckStats {
  readonly main = input.required<number[]>();
  readonly reserve = input.required<number[]>();
  readonly terrain = input.required<{ foret: number; montagne: number; ocean: number }>();
}
