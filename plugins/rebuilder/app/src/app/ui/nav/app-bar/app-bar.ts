import { DOCUMENT } from '@angular/common';
import { Component, effect, inject, input } from '@angular/core';

/** Bars stuck at the moment: during a route change, the next page's bar can mount before the previous one is destroyed. */
let stuckBars = 0;

/**
 * Application bar of compact screens (the site draws its own header above): projected `[leading]`,
 * title / subtitle (or a projected `[titles]` when both are empty), projected `[actions]`.
 * Sticky under the site header unless `sticky` is false; while stuck, it raises `--ac-scroll-top-offset` on `<html>`
 * so that what the browser scrolls to the top (keyboard focus, scrollIntoView, anchors) stops below it
 * (design-system/css/base.css).
 */
@Component({
  selector: 'ac-app-bar',
  templateUrl: './app-bar.html',
  styleUrl: './app-bar.scss',
  host: { '[class.static]': '!sticky()' },
})
export class AcAppBar {
  readonly title = input('');
  readonly subtitle = input('');
  readonly sticky = input(true);

  constructor() {
    const root = inject(DOCUMENT).documentElement;
    effect((onCleanup) => {
      if (!this.sticky()) return;
      if (stuckBars++ === 0) root.style.setProperty('--ac-scroll-top-offset', 'var(--ac-app-bar-height)');
      onCleanup(() => {
        if (--stuckBars === 0) root.style.removeProperty('--ac-scroll-top-offset');
      });
    });
  }
}
