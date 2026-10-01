import { Component, input } from '@angular/core';

/** Determinate progress bar (`role=progressbar`), 0 to 100. */
@Component({
  selector: 'ar-progress-bar',
  host: {
    role: 'progressbar',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    '[attr.aria-valuenow]': 'value()',
    '[attr.aria-label]': 'ariaLabel() || null',
  },
  templateUrl: './progress-bar.html',
  styleUrl: './progress-bar.scss',
})
export class ArProgressBar {
  readonly value = input(0);
  readonly ariaLabel = input('');
}
