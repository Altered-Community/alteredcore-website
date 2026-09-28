import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ArIcon } from '../../icon';

/** Round "+" posed on a card tile. */
@Component({
  selector: 'ar-card-add',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArIcon],
  templateUrl: './card-add.html',
  styleUrl: './card-add.scss',
})
export class ArCardAdd {
  readonly label = input('Ajouter au deck');
  readonly disabled = input(false);
  readonly add = output<void>();
}
