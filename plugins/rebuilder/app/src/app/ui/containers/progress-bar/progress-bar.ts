import { Component, input } from '@angular/core';

/** Determinate progress bar (`role=progressbar`), 0 to 100: `.ac-progress` (design-system/css/components/feedback.css). */
@Component({
  selector: 'ac-progress-bar',
  host: {
    class: 'ac-progress',
    role: 'progressbar',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    '[attr.aria-valuenow]': 'value()',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[class.ac-progress--success]': "tone() === 'success'",
    '[class.ac-progress--danger]': "tone() === 'danger'",
  },
  templateUrl: './progress-bar.html',
  styleUrl: './progress-bar.scss',
})
export class AcProgressBar {
  readonly value = input(0);
  readonly ariaLabel = input('');
  /** A bar measured against a cap: `success` when it is reached, `danger` when it is exceeded. */
  readonly tone = input<'primary' | 'success' | 'danger'>('primary');
}
