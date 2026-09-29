import { Component, computed, input } from '@angular/core';
import { uiLocale } from '../../../core/i18n';
import { ArIcon } from '../../icon';

const compact = new Intl.NumberFormat(uiLocale(), { notation: 'compact', maximumFractionDigits: 1 });

/** Like count pill laid over a visual (deck card): heart + count, filled when `liked`; `ariaLabel` is required. */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- styles a native <button> so it keeps its semantics
  selector: 'button[arLikeButton]',
  imports: [ArIcon],
  host: {
    type: 'button',
    class: 'ar-like-button',
    '[class.ar-like-button--liked]': 'liked()',
    '[attr.aria-pressed]': 'liked()',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.title]': 'ariaLabel()',
  },
  templateUrl: './like-button.html',
  styleUrl: './like-button.scss',
})
export class ArLikeButton {
  readonly count = input(0);
  readonly liked = input(false);
  /** Accessible name, e.g. « J’aime Kojo Havre, 128 j’aime ». */
  readonly ariaLabel = input.required<string>();
  protected readonly label = computed(() => compact.format(this.count()));
}
