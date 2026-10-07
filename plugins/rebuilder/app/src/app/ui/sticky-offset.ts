import { DOCUMENT } from '@angular/common';
import { DestroyRef, Directive, ElementRef, Service, afterEveryRender, booleanAttribute, effect, inject, input } from '@angular/core';

/**
 * Keeps what the browser scrolls to the top (keyboard focus, scrollIntoView, anchors) below the sticky bars of the
 * plugin: `--ac-scroll-top-offset` on <html> (design-system/css/base.css) is set to the bottom of the lowest bar, less
 * the site header (`--ac-page-top`).
 *
 * A bar counts while it is sticky, shown and in the document. A bar can be alive out of the document: the Decks list
 * stays mounted, detached, while a deck is open (DecksListReuseStrategy), so the bars are checked after every render.
 * A bar is measured again when a bar comes or goes, when its size changes (the search head that condenses) and when
 * the window is resized (the site header follows the width).
 */
@Service()
export class AcStickyOffsets {
  private readonly root = inject(DOCUMENT).documentElement;
  /** Bottom of each bar where it sticks, in px from the top of the viewport; NaN while it does not count. */
  private readonly bottoms = new Map<HTMLElement, number>();
  private readonly resize =
    typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => {
          this.measureAll();
          this.sync();
        });
  private stale = false;
  private offset = '';

  constructor() {
    const view = inject(DOCUMENT).defaultView;
    const onResize = () => {
      this.measureAll();
      this.sync();
    };
    view?.addEventListener('resize', onResize, { passive: true });
    afterEveryRender(() => this.sync());
    inject(DestroyRef).onDestroy(() => {
      view?.removeEventListener('resize', onResize);
      this.resize?.disconnect();
    });
  }

  /** Counts `bar` from the next render (its styles, and the other bars' positions, may change with it). */
  add(bar: HTMLElement): void {
    if (this.bottoms.has(bar)) return;
    this.bottoms.set(bar, NaN);
    this.resize?.observe(bar, { box: 'border-box' });
    this.stale = true;
  }

  delete(bar: HTMLElement): void {
    if (!this.bottoms.delete(bar)) return;
    this.resize?.unobserve(bar);
    this.stale = true;
    this.sync();
  }

  /** Sets the offset to the lowest bar in the document, or removes it when there is none. */
  sync(): void {
    if (this.stale) this.measureAll();
    let bottom = -Infinity;
    for (const [bar, b] of this.bottoms) if (bar.isConnected && b > bottom) bottom = b;
    const offset = Number.isFinite(bottom) ? `calc(${Math.ceil(bottom)}px - var(--ac-page-top))` : '';
    if (offset === this.offset) return;
    this.offset = offset;
    if (offset) this.root.style.setProperty('--ac-scroll-top-offset', offset);
    else this.root.style.removeProperty('--ac-scroll-top-offset');
  }

  private measureAll(): void {
    this.stale = false;
    for (const bar of this.bottoms.keys()) this.bottoms.set(bar, stuckBottom(bar));
  }
}

/** Where the bottom of `bar` sits once it sticks (its `top` plus its height), NaN when it is hidden or not sticky. */
function stuckBottom(bar: HTMLElement): number {
  if (!bar.isConnected) return NaN;
  const style = getComputedStyle(bar);
  const height = bar.getBoundingClientRect().height;
  const sticks = style.position === 'sticky' || style.position === 'fixed';
  return sticks && height > 0 ? parseFloat(style.top) + height : NaN;
}

/**
 * Counts `bar` in the scroll offset while `counts()` is true, until the caller is destroyed. Call it in an injection
 * context (a constructor).
 */
export function countStickyOffset(bar: HTMLElement, counts: () => boolean = () => true): void {
  const offsets = inject(AcStickyOffsets);
  effect(() => (counts() ? offsets.add(bar) : offsets.delete(bar)));
  inject(DestroyRef).onDestroy(() => offsets.delete(bar));
}

/**
 * Counts a sticky element of the page in the scroll offset (`acStickyOffset`, or `[acStickyOffset]="false"` while it
 * does not stick), so focus and scrollIntoView stop below it.
 */
@Directive({ selector: '[acStickyOffset]' })
export class AcStickyOffset {
  readonly acStickyOffset = input(true, { transform: booleanAttribute });

  constructor() {
    countStickyOffset(inject<ElementRef<HTMLElement>>(ElementRef).nativeElement, this.acStickyOffset);
  }
}
