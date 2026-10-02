import { Component, computed, input } from '@angular/core';

export interface AcDonutSegment {
  key: string;
  label: string;
  /** Weight of the slice. */
  value: number;
  /** Figure shown in the legend (e.g. « 2,9 »). */
  display: string;
  tone: 'character' | 'spell' | 'permanent';
}

/** Design-system colour of each tone (`--ac-cards-type-*`, shared with the site's card pages). */
const TONE_COLOR: Record<AcDonutSegment['tone'], string> = {
  character: 'var(--ac-cards-type-character)',
  spell: 'var(--ac-cards-type-spell)',
  permanent: 'var(--ac-cards-type-other)',
};

/** Ring chart with its legend (average composition of an opening hand). */
@Component({
  selector: 'ac-donut-chart',
  templateUrl: './donut-chart.html',
  styleUrl: './donut-chart.scss',
})
export class AcDonutChart {
  readonly segments = input.required<AcDonutSegment[]>();
  readonly ariaLabel = input('');
  /** conic-gradient slices, in the tone colours of the tokens. */
  protected readonly ring = computed(() => {
    const segs = this.segments();
    const total = segs.reduce((n, s) => n + s.value, 0);
    if (!total) return 'var(--ac-color-track)';
    let from = 0;
    const stops = segs.map((s) => {
      const to = from + (s.value / total) * 100;
      const stop = `${TONE_COLOR[s.tone]} ${from.toFixed(2)}% ${to.toFixed(2)}%`;
      from = to;
      return stop;
    });
    return `conic-gradient(${stops.join(', ')})`;
  });
}
