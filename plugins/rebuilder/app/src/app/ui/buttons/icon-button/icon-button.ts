import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ArIcon, type ArIconName } from '../../icon';
import { type ArSize } from '../types';

/** Square icon button; `ariaLabel` is required. */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- styles native <button>/<a> so they keep their semantics
  selector: 'button[arIconButton], a[arIconButton]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArIcon],
  host: {
    '[class]': "'ar-icon-button ar-icon-button--' + variant() + ' ar-icon-button--' + size()",
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.title]': 'ariaLabel()',
  },
  templateUrl: './icon-button.html',
  styleUrl: './icon-button.scss',
})
export class ArIconButton {
  readonly arIconButton = input.required<ArIconName>();
  readonly ariaLabel = input.required<string>();
  readonly variant = input<'secondary' | 'ghost' | 'primary'>('secondary');
  readonly size = input<ArSize>('md');
  readonly iconSize = input(20);
}
