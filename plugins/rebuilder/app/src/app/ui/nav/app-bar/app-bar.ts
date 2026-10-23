import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, ElementRef, afterEveryRender, effect, inject, input } from '@angular/core';

/**
 * Sticky bars alive. A bar can be alive out of the document: the Decks list stays mounted, detached, while a deck is
 * open (DecksListReuseStrategy). The offset follows the bars in the document, checked after every render.
 */
const stickyBars = new Set<HTMLElement>();
let offsetSet = false;

function syncScrollOffset(root: HTMLElement): void {
  const stuck = [...stickyBars].some((bar) => bar.isConnected);
  if (stuck === offsetSet) return;
  offsetSet = stuck;
  if (stuck) root.style.setProperty('--ac-scroll-top-offset', 'var(--ac-app-bar-height)');
  else root.style.removeProperty('--ac-scroll-top-offset');
}

/**
 * Application bar of compact screens (the site draws its own header above): projected `[leading]`,
 * title / subtitle (or a projected `[titles]` when both are empty), projected `[actions]`.
 * Sticky under the site header unless `sticky` is false; while stuck, what the browser scrolls to the top (keyboard
 * focus, scrollIntoView, anchors) stops below it (`--ac-scroll-top-offset`, design-system/css/base.css).
 */
@Component({
  selector: 'ac-app-bar',
  templateUrl: './app-bar.html',
  styleUrl: './app-bar.scss',
  host: { '[style.position]': "sticky() ? null : 'static'" },
})
export class AcAppBar {
  readonly title = input('');
  readonly subtitle = input('');
  readonly sticky = input(true);

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const root = inject(DOCUMENT).documentElement;
    effect(() => (this.sticky() ? stickyBars.add(host) : stickyBars.delete(host)));
    afterEveryRender(() => syncScrollOffset(root));
    inject(DestroyRef).onDestroy(() => {
      stickyBars.delete(host);
      syncScrollOffset(root);
    });
  }
}
