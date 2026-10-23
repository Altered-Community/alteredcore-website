import { Component, input } from '@angular/core';
import { AcIcon, type AcIconName } from '../../icon';
import type { AcTone } from '../../fields';

/** Status or category pill: `ac-badge` (design-system/css/components/chips.css). */
@Component({
  selector: 'ac-badge',
  imports: [AcIcon],
  host: {
    class: 'ac-badge',
    '[class.ac-badge--blue]': "tone() === 'blue'",
    '[class.ac-badge--green]': "tone() === 'green'",
    '[class.ac-badge--violet]': "tone() === 'violet'",
    '[class.ac-badge--red]': "tone() === 'red'",
    '[class.ac-badge--orange]': "tone() === 'orange'",
    '[class.ac-badge--lg]': 'size() === 28',
    '[class.ac-badge--dense]': 'dense()',
  },
  templateUrl: './badge.html',
})
export class AcBadge {
  readonly tone = input<AcTone>('blue');
  readonly icon = input<AcIconName | undefined>(undefined);
  readonly size = input<24 | 28>(24);
  /** Tighter padding and gap, for a row of badges where room is short. */
  readonly dense = input(false);
}
