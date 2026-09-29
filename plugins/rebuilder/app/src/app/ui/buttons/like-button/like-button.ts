import { Component, computed, input } from '@angular/core';
import { AcIcon } from '../../icon';

const compact = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 });

/** Like count pill laid over a visual (deck card): heart + count, filled when `liked`; `ariaLabel` is required. */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- styles a native <button> so it keeps its semantics
  selector: 'button[acLikeButton]',
  imports: [AcIcon],
  host: {
    type: 'button',
    class: 'ac-like-button',
    '[class.ac-like-button--liked]': 'liked()',
    '[attr.aria-pressed]': 'liked()',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.title]': 'ariaLabel()',
  },
  templateUrl: './like-button.html',
  styleUrl: './like-button.scss',
})
export class AcLikeButton {
  readonly count = input(0);
  readonly liked = input(false);
  /** Accessible name, e.g. « J’aime Kojo Havre, 128 j’aime ». */
  readonly ariaLabel = input.required<string>();
  protected readonly label = computed(() => compact.format(this.count()));
}
