import { Component, input } from '@angular/core';
import { formatPercent, formatPrecisePercent } from '../../../core/hand-odds';
import { uiLocale } from '../../../core/i18n';

export interface ArProbabilityBar {
  key: string;
  label: string;
  /** 0…1; `null` = nothing to compute yet (empty bar, no figure). */
  p: number | null;
  /** Unfavourable outcome (dead hand, heavy hand…): accent colour. */
  warn?: boolean;
}

/** Probability bars: label, bar filled to p, rounded percentage (two decimals on hover). */
@Component({
  selector: 'ar-probability-bars',
  host: { '[class.wide]': "labelWidth() === 'wide'" },
  templateUrl: './probability-bars.html',
  styleUrl: './probability-bars.scss',
})
export class ArProbabilityBars {
  readonly rows = input.required<ArProbabilityBar[]>();
  readonly ariaLabel = input('');
  /** Label column: `narrow` (« 2+ », « 3 mana ») or `wide` (« Les 2 Expéditions »). */
  readonly labelWidth = input<'narrow' | 'wide'>('narrow');
  protected pct(p: number): string {
    return formatPercent(p, uiLocale());
  }
  protected precise(p: number): string {
    return formatPrecisePercent(p, uiLocale());
  }
  /** Tiny non-zero odds still show a sliver. */
  protected width(p: number | null): number {
    return !p || p <= 0 ? 0 : Math.max(p * 100, 0.8);
  }
}
