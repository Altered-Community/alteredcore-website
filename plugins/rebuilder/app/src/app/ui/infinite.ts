import { Directive, ElementRef, afterNextRender, inject, input, output, type OnDestroy } from '@angular/core';

/**
 * Emits `visible` while the host sits within `lookahead` viewports below the fold.
 * Place it after the last result; 3 viewports of lookahead covers a fast mobile flick.
 */
@Directive({ selector: '[acInfiniteSentinel]' })
export class AcInfiniteSentinel implements OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  readonly lookahead = input(3);
  readonly visible = output<boolean>();
  private observer?: IntersectionObserver;

  constructor() {
    afterNextRender(() => {
      if (typeof IntersectionObserver === 'undefined') {
        this.visible.emit(true);
        return;
      }
      this.observer = new IntersectionObserver(
        (entries) => this.visible.emit(entries.some((e) => e.isIntersecting)),
        { rootMargin: `0px 0px ${this.lookahead() * 100}% 0px` },
      );
      this.observer.observe(this.el.nativeElement);
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
