import { Component, input, model } from '@angular/core';
import { ArIcon } from '../../icon';

/** Section that folds (closed by default; the Stats sections open it). */
@Component({
  selector: 'ar-collapsible',
  imports: [ArIcon],
  host: { '[class.bare]': 'bare()', '[class.open]': 'open()' },
  templateUrl: './collapsible.html',
  styleUrl: './collapsible.scss',
})
export class ArCollapsible {
  readonly title = input.required<string>();
  readonly open = model(false);
  readonly bare = input(false);
  protected readonly id = `ar-col-${Math.random().toString(36).slice(2, 8)}`;
}
