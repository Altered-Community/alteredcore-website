import { Component, computed, input, model, output } from '@angular/core';
import { AcIcon } from '../../icon';

/**
 * Selectable or removable pill: `<button class="ac-chip">` (design-system/css/components/chips.css).
 * `dot` takes a faction CSS colour variable; `image` the URL of a picture before the label (a faction's mark), instead.
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
  readonly image = input<string | null>(null);
  /** The image alone (`ac-chip--icon`): `label` becomes its accessible name and title. */
  readonly iconOnly = input(false);
  readonly removable = input(false);
  readonly selected = model(false);
  readonly shape = input<'pill' | 'square'>('pill');
  readonly remove = output<void>();
  protected readonly removeLabel = computed(() => $localize`:@@ui.chip.remove:Retirer le filtre ${this.label()}:label:`);
}
