import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { ArIcon } from '../../icon';

/** Selectable or removable pill — DS-Puces. `dot` takes a faction CSS colour variable. */
@Component({
  selector: 'ar-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArIcon],
  templateUrl: './chip.html',
  styleUrl: './chip.scss',
})
export class ArChip {
  readonly label = input.required<string>();
  readonly dot = input<string | null>(null);
  readonly removable = input(false);
  readonly selected = model(false);
  readonly shape = input<'pill' | 'square'>('pill');
  readonly remove = output<void>();
}
