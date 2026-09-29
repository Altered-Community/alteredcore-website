import { Component, computed, input, model } from '@angular/core';
import { ArIcon } from '../../icon';

/** Copy counter: `overlay` sits on card tiles, `inline` in deck rows. */
@Component({
  selector: 'ar-stepper',
  imports: [ArIcon],
  templateUrl: './stepper.html',
  styleUrl: './stepper.scss',
})
export class ArStepper {
  readonly value = model(0);
  readonly min = input(0);
  readonly max = input(3);
  readonly appearance = input<'overlay' | 'inline' | 'box'>('inline');
  readonly label = input('');
  readonly itemName = input('');

  protected readonly suffix = computed(() => (this.itemName() ? ` de ${this.itemName()}` : ''));
  protected readonly iconSize = computed(() => (this.appearance() === 'overlay' ? 16 : 14));

  step(delta: number): void {
    const next = Math.max(this.min(), Math.min(this.max(), this.value() + delta));
    if (next !== this.value()) this.value.set(next);
  }
}
