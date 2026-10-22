import { Directive, computed, input } from '@angular/core';

export type AcSkeletonShape = '' | 'text' | 'title' | 'control' | 'control-sm' | 'badge' | 'circle' | 'card' | 'panel';

/**
 * Shape of content that is loading (`ac-skeleton`, design system feedback), hidden from screen readers: the loading
 * region carries `aria-busy` and the page a status text. `<span acSkeleton="text" width="40%">`; `width` sets
 * `--ac-skeleton-width` (100 % by default). No shape: a block the layout sizes.
 */
@Directive({
  selector: '[acSkeleton]',
  host: {
    class: 'ac-skeleton',
    '[class]': 'variant()',
    '[style.--ac-skeleton-width]': 'width()',
    'aria-hidden': 'true',
  },
})
export class AcSkeleton {
  readonly acSkeleton = input<AcSkeletonShape>('');
  readonly width = input<string | null>(null);
  protected readonly variant = computed(() => (this.acSkeleton() ? `ac-skeleton--${this.acSkeleton()}` : ''));
}
