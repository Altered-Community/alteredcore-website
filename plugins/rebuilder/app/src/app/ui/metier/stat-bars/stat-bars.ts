import { Component, computed, input } from '@angular/core';

export interface ArStatBar {
  key: string;
  /** Row label; with `iconSrc`, the icon's alternative text. */
  label: string;
  value: number;
  iconSrc?: string;
  /** Bar colour: primary, or a terrain colour (average powers). */
  tone?: 'primary' | 'foret' | 'montagne' | 'ocean';
}

/** Horizontal bars (cards per type, average powers), scaled to the largest value. */
@Component({
  selector: 'ar-stat-bars',
  templateUrl: './stat-bars.html',
  styleUrl: './stat-bars.scss',
})
export class ArStatBars {
  readonly label = input.required<string>();
  readonly rows = input.required<ArStatBar[]>();
  /** Scale; defaults to the largest value (at least 1). */
  readonly max = input<number | null>(null);
  protected readonly peak = computed(() => this.max() ?? Math.max(1, ...this.rows().map((r) => r.value)));
  protected width(value: number): number {
    return Math.min(100, Math.round((value / this.peak()) * 100));
  }
}
