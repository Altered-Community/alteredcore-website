import { Component, input } from '@angular/core';

/** Filter panel section: overline title, optional count and a projected `[action]`. */
@Component({
  selector: 'ac-filter-section',
  templateUrl: './filter-section.html',
  styleUrl: './filter-section.scss',
})
export class AcFilterSection {
  readonly title = input.required<string>();
  readonly count = input<number | null>(null);
}
