import { Component, input } from '@angular/core';

/** Filter panel section: overline title, optional count and a projected `[action]`. */
// `title` is an input: a static title="…" would also stay on the host as the browser's tooltip over the whole component.
@Component({
  selector: 'ac-filter-section',
  host: { '[attr.title]': 'null' },
  templateUrl: './filter-section.html',
  styleUrl: './filter-section.scss',
})
export class AcFilterSection {
  readonly title = input.required<string>();
  readonly count = input<number | null>(null);
  /** No title row (room in height): the controls say what they filter, and name their group for screen readers. */
  readonly headless = input(false);
}
