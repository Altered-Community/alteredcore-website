import { Component, computed, input } from '@angular/core';
import { uiLocale } from '../../../core/i18n';

export interface ArStatBar {
  key: string;
  label: string;
  /** Icon in place of the label text (terrain), the label stays its alt text. */
  icon?: string;
  value: number;
  /** Bar colour (a `var(--ar-*)`); the main chart colour by default. */
  color?: string;
}

/** Horizontal bars scaled on the largest value: label (or icon), bar, figure. Types of cards, average powers. */
@Component({
  selector: 'ar-stat-bars',
  templateUrl: './stat-bars.html',
  styleUrl: './stat-bars.scss',
})
export class ArStatBars {
  readonly rows = input.required<ArStatBar[]>();
  readonly title = input('');
  /** Decimals of the figures (average powers: 1). */
  readonly decimals = input(0);
  private readonly max = computed(() => Math.max(1, ...this.rows().map((r) => r.value)));
  protected width(value: number): number {
    return Math.max(0, (value / this.max()) * 100);
  }
  protected figure(value: number): string {
    return value.toLocaleString(uiLocale(), { maximumFractionDigits: this.decimals() });
  }
}
