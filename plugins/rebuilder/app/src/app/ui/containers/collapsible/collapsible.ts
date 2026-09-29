import { Component, input, model } from '@angular/core';
import { AcIcon } from '../../icon';

/** Section that folds (closed by default; the Stats sections open it). */
@Component({
  selector: 'ac-collapsible',
  imports: [AcIcon],
  host: { '[class.bare]': 'bare()', '[class.open]': 'open()' },
  templateUrl: './collapsible.html',
  styleUrl: './collapsible.scss',
})
export class AcCollapsible {
  readonly title = input.required<string>();
  readonly open = model(false);
  readonly bare = input(false);
  protected readonly id = `ac-col-${Math.random().toString(36).slice(2, 8)}`;
}
