import { Component, computed, input } from '@angular/core';

const AXIS = ['1', '2', '3', '4', '5', '6', '7+'];

/**
 * Main and reserve costs side by side, 1…7+, for the deck bar. `md`: legend and counts above the bars (deck bar);
 * `sm`: bars and axis only, one row high (reduced bar), the `highlight` bucket outlined (cost of the last card added).
 */
@Component({
  selector: 'ac-cost-curve',
  host: { role: 'img', '[attr.aria-label]': 'summary()', '[class.sm]': "size() === 'sm'" },
  templateUrl: './cost-curve.html',
  styleUrl: './cost-curve.scss',
})
export class AcCostCurve {
  readonly main = input.required<number[]>();
  readonly reserve = input.required<number[]>();
  readonly size = input<'md' | 'sm'>('md');
  /** Bucket index (0…6) outlined, `null` for none. */
  readonly highlight = input<number | null>(null);

  private readonly peak = computed(() => Math.max(1, ...this.main(), ...this.reserve()));
  private readonly scale = computed(() => (this.size() === 'sm' ? 26 : 48));
  protected readonly buckets = computed(() =>
    AXIS.map((label, i) => {
      const m = this.main()[i] ?? 0;
      const r = this.reserve()[i] ?? 0;
      return {
        label,
        m,
        r,
        mh: this.height(m),
        rh: this.height(r),
        title: $localize`:@@ui.costCurve.bucket:Coût ${label}:cost: : ${m}:main: en main, ${r}:reserve: en réserve`,
      };
    }),
  );
  protected readonly summary = computed(
    () => `${$localize`:@@ui.costCurve.label:Courbe de coût : main et réserve`}. ${this.buckets().map((b) => b.title).join(' ; ')}`,
  );

  private height(v: number): number {
    return v ? Math.max(3, Math.round((v / this.peak()) * this.scale())) : 2;
  }
}
