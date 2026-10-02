import { Component, input } from '@angular/core';
import { AcIcon, type AcIconName } from '../../icon';
import { type AcButtonVariant, type AcSize } from '../types';

/**
 * `<button acButton>` / `<a acButton>`: sets the `ac-button` classes of the design system
 * (design-system/css/components/button.css), which draws it.
 */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- styles native <button>/<a> so they keep their semantics
  selector: 'button[acButton], a[acButton]',
  imports: [AcIcon],
  host: {
    class: 'ac-button',
    '[class.ac-button--secondary]': "variant() === 'secondary'",
    '[class.ac-button--ghost]': "variant() === 'ghost'",
    '[class.ac-button--add]': "variant() === 'add'",
    '[class.ac-button--danger]': "variant() === 'danger'",
    '[class.ac-button--sm]': "size() === 'sm'",
    '[class.ac-button--lg]': "size() === 'lg'",
    '[class.ac-button--full]': 'fullWidth()',
  },
  templateUrl: './button.html',
})
export class AcButton {
  readonly variant = input<AcButtonVariant>('primary');
  readonly size = input<AcSize>('md');
  readonly icon = input<AcIconName | undefined>(undefined);
  readonly fullWidth = input(false);
}
