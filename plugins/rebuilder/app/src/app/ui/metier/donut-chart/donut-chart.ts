import { Component, computed, input } from '@angular/core';

export interface ArDonutSegment {
  key: string;
  label: string;
  /** Weight of the slice. */
  value: number;
  /** Figure shown in the legend (e.g. « 2,9 »). */
  display: string;
  tone: 'character' | 'spell' | 'permanent';
}

/** Ring chart with its legend (average composition of an opening hand). */
@Component({
  selector: 'ar-donut-chart',
  templateUrl: './donut-chart.html',
  styleUrl: './donut-chart.scss',
})
export class ArDonutChart {
  readonly segments = input.required<ArDonutSegment[]>();
  readonly ariaLabel = input('');
  /** conic-gradient slices, in the tone colours of the tokens. */
  protected readonly ring = computed(() => {
    const segs = this.segments();
    const total = segs.reduce((n, s) => n + s.value, 0);
    if (!total) return 'var(--ar-color-track)';
    let from = 0;
    const stops = segs.map((s) => {
      const to = from + (s.value / total) * 100;
      const stop = `var(--ar-color-type-${s.tone}) ${from.toFixed(2)}% ${to.toFixed(2)}%`;
      from = to;
      return stop;
    });
    return `conic-gradient(${stops.join(', ')})`;
  });
}
