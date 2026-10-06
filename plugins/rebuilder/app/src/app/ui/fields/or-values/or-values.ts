import { Component, input, model } from '@angular/core';
import { AcIcon } from '../../icon';
import type { ComboOption } from '../combobox/combobox';

/**
 * Values one per line, « ou » on its own line between two, each value with a button that removes it
 * (effect editor). `empty` is shown when
 * there is none (« Tous les effets »).
 */
@Component({
  selector: 'ac-or-values',
  imports: [AcIcon],
  templateUrl: './or-values.html',
  styleUrl: './or-values.scss',
})
export class AcOrValues {
  readonly values = model<ComboOption[]>([]);
  readonly empty = input('');

  protected removeLabel(v: ComboOption): string {
    return $localize`:@@ui.combobox.remove:Retirer ${v.text}:value:`;
  }

  protected remove(v: ComboOption): void {
    this.values.update((list) => list.filter((x) => x.id !== v.id));
  }
}
