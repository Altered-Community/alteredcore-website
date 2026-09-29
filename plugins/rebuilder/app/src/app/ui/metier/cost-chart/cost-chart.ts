import { Component, computed, input } from '@angular/core';

/** Cost histogram 1…7+ (main or reserve). */
@Component({
  selector: 'ar-cost-chart',
  host: { '[class.reserve]': "tone() === 'reserve'" },
  templateUrl: './cost-chart.html',
  styleUrl: './cost-chart.scss',
})
export class ArCostChart {
  readonly values = input.required<number[]>();
  readonly tone = input<'main' | 'reserve'>('main');
  readonly label = input('Coût main');
  protected readonly axis = ['1', '2', '3', '4', '5', '6', '7+'];
  private readonly peak = computed(() => Math.max(1, ...this.values()));
  height(v: number): number {
    return Math.round((v / this.peak()) * 36);
  }
}
