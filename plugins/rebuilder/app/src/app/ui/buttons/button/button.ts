import { Component, input } from '@angular/core';
import { ArIcon, type ArIconName } from '../../icon';
import { type ArButtonVariant, type ArSize } from '../types';

/** `<button arButton>` / `<a arButton>` — DS-Boutons. */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- styles native <button>/<a> so they keep their semantics
  selector: 'button[arButton], a[arButton]',
  imports: [ArIcon],
  host: {
    class: 'ar-button',
    '[class]': "'ar-button ar-button--' + variant() + ' ar-button--' + size() + (fullWidth() ? ' ar-button--full' : '')",
  },
  templateUrl: './button.html',
  styleUrl: './button.scss',
})
export class ArButton {
  readonly variant = input<ArButtonVariant>('primary');
  readonly size = input<ArSize>('md');
  readonly icon = input<ArIconName | undefined>(undefined);
  readonly fullWidth = input(false);
}
