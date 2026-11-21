import { Component, input, output } from '@angular/core';
import { AcIcon } from '../../icon';

/** Round "+" posed on a card tile. */
@Component({
  selector: 'ac-card-add',
  imports: [AcIcon],
  templateUrl: './card-add.html',
  styleUrl: './card-add.scss',
})
export class AcCardAdd {
  readonly label = input($localize`:@@ui.cardAdd.label:Ajouter au deck`);
  readonly disabled = input(false);
  /** `sm`: 28 px (on the edge of a card tile on phones), its hit area still `--ac-hit-min`. */
  readonly size = input<'md' | 'sm'>('md');
  readonly add = output<void>();
}
