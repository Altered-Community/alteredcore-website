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
  readonly label = input('Ajouter au deck');
  readonly disabled = input(false);
  readonly add = output<void>();
}
