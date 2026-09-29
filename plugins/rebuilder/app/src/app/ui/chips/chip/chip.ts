import { Component, input, model, output } from '@angular/core';
import { AcIcon } from '../../icon';

/**
 * Selectable or removable pill: `<button class="ac-chip">` (design-system/css/components/chips.css).
 * `dot` takes a faction CSS colour variable.
 */
@Component({
  selector: 'ac-chip',
  imports: [AcIcon],
  templateUrl: './chip.html',
  styleUrl: './chip.scss',
})
export class AcChip {
  readonly label = input.required<string>();
  readonly dot = input<string | null>(null);
  readonly removable = input(false);
  readonly selected = model(false);
  readonly shape = input<'pill' | 'square'>('pill');
  readonly remove = output<void>();
}
