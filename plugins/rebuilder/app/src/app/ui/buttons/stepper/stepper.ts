import { Component, computed, input, model } from '@angular/core';
import { AcIcon } from '../../icon';

/** Copy counter: `overlay` sits on card tiles, `inline` in deck rows. */
@Component({
  selector: 'ac-stepper',
  imports: [AcIcon],
  templateUrl: './stepper.html',
  styleUrl: './stepper.scss',
})
export class AcStepper {
  readonly value = model(0);
  readonly min = input(0);
  readonly max = input(3);
  readonly appearance = input<'overlay' | 'inline' | 'box'>('inline');
  readonly label = input('');
  readonly itemName = input('');

  protected readonly copiesLabel = $localize`:@@ui.stepper.copies:Exemplaires`;
  protected readonly decLabel = computed(() => {
    const name = this.itemName();
    return name ? $localize`:@@ui.stepper.removeOneOf:Retirer un exemplaire de ${name}:name:` : $localize`:@@ui.stepper.removeOne:Retirer un exemplaire`;
  });
  protected readonly incLabel = computed(() => {
    const name = this.itemName();
    return name ? $localize`:@@ui.stepper.addOneOf:Ajouter un exemplaire de ${name}:name:` : $localize`:@@ui.stepper.addOne:Ajouter un exemplaire`;
  });
  protected readonly iconSize = computed(() => (this.appearance() === 'overlay' ? 16 : 14));

  step(delta: number): void {
    const next = Math.max(this.min(), Math.min(this.max(), this.value() + delta));
    if (next !== this.value()) this.value.set(next);
  }
}
