import { Component, input, output } from '@angular/core';
import { ArChip } from '../chip/chip';

/** Active filters on one scrolling line, "Tout effacer" pinned right over a fade. */
@Component({
  selector: 'ar-filter-bar',
  imports: [ArChip],
  templateUrl: './filter-bar.html',
  styleUrl: './filter-bar.scss',
})
export class ArFilterBar {
  readonly chips = input<{ id: string; label: string }[]>([]);
  readonly remove = output<string>();
  readonly clearAll = output<void>();
}
