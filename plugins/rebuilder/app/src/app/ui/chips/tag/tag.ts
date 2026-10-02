import { Component, input } from '@angular/core';

/** Small square label on a tile: `ac-tag` (design-system/css/components/chips.css). */
@Component({
  selector: 'ac-tag',
  host: {
    class: 'ac-tag',
    '[class.ac-tag--green]': "tone() === 'green'",
    '[class.ac-tag--violet]': "tone() === 'violet'",
    '[class.ac-tag--red]': "tone() === 'red'",
    '[class.ac-tag--orange]': "tone() === 'orange'",
  },
  templateUrl: './tag.html',
})
export class AcTag {
  readonly tone = input<'green' | 'violet' | 'red' | 'orange'>('green');
}
