import { Component, input } from '@angular/core';

/** Number bubble: `ac-count` (design-system/css/components/chips.css). */
@Component({
  selector: 'ac-count',
  host: { class: 'ac-count', '[class.ac-count--success]': "tone() === 'success'", '[class.ac-count--soft]': "tone() === 'soft'" },
  templateUrl: './count.html',
})
export class AcCount {
  readonly value = input<number | string>(0);
  readonly tone = input<'dark' | 'success' | 'soft'>('dark');
}
