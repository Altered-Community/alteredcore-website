import { Component, input } from '@angular/core';
import { AcIcon, type AcIconName } from '../../icon';
import { type AcSize } from '../types';

/**
 * Square icon button (`ac-icon-button`, design-system/css/components/button.css); `ariaLabel` is
 * required.
 */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- styles native <button>/<a> so they keep their semantics
  selector: 'button[acIconButton], a[acIconButton]',
  imports: [AcIcon],
  host: {
    class: 'ac-icon-button',
    '[class.ac-icon-button--ghost]': "variant() === 'ghost'",
    '[class.ac-icon-button--primary]': "variant() === 'primary'",
    '[class.ac-icon-button--sm]': "size() === 'sm'",
    '[class.ac-icon-button--lg]': "size() === 'lg'",
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.title]': 'ariaLabel()',
  },
  templateUrl: './icon-button.html',
})
export class AcIconButton {
  readonly acIconButton = input.required<AcIconName>();
  readonly ariaLabel = input.required<string>();
  readonly variant = input<'secondary' | 'ghost' | 'primary'>('secondary');
  readonly size = input<AcSize>('md');
  readonly iconSize = input(20);
}
