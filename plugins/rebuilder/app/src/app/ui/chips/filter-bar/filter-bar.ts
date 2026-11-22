import { Component, input, output } from '@angular/core';
import { AcChip } from '../chip/chip';

/** Active filters on one scrolling line, "Tout effacer" pinned right over a fade. */
@Component({
  selector: 'ac-filter-bar',
  imports: [AcChip],
  templateUrl: './filter-bar.html',
  styleUrl: './filter-bar.scss',
})
export class AcFilterBar {
  readonly chips = input<{ id: string; label: string }[]>([]);
  readonly remove = output<string>();
  readonly clearAll = output<void>();
}
