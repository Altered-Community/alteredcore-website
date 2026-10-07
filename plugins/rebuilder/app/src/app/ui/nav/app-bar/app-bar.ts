import { Component, ElementRef, inject, input } from '@angular/core';
import { countStickyOffset } from '../../sticky-offset';

/**
 * Application bar of compact screens (the site draws its own header above): projected `[leading]`,
 * title / subtitle (or a projected `[titles]` when both are empty), projected `[actions]`.
 * Sticky under the site header unless `sticky` is false; while stuck, what the browser scrolls to the top (keyboard
 * focus, scrollIntoView, anchors) stops below it (`--ac-scroll-top-offset`, `AcStickyOffsets`).
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
    countStickyOffset(inject<ElementRef<HTMLElement>>(ElementRef).nativeElement, this.sticky);
  }
}
