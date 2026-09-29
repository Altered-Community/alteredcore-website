import { NgComponentOutlet } from '@angular/common';
import { Component, ElementRef, afterRenderEffect, computed, inject, viewChild } from '@angular/core';
import { AcIcon } from '../../icon';
import { AC_OVERLAY_CONTENT } from '../overlay';

@Component({
  selector: 'ac-overlay-container',
  imports: [NgComponentOutlet, AcIcon],
  host: {
    '[class]': "'ac-overlay ac-overlay--' + content.mode + (content.fill ? ' ac-overlay--fill' : '')",
    role: 'presentation',
  },
  templateUrl: './overlay-container.html',
  styleUrl: './overlay-container.scss',
})
export class AcOverlayContainer {
  protected readonly content = inject(AC_OVERLAY_CONTENT);
  protected readonly root = this.content.ref;
  protected readonly top = computed(() => this.root.views().at(-1)!);
  private readonly titleEl = viewChild<ElementRef<HTMLElement>>('title');
  private readonly openers: (Element | null)[] = [];
  private depth = 1;

  constructor() {
    // Step change: focus the new title (announced by screen readers); back: return focus to the opener.
    afterRenderEffect(() => {
      const depth = this.root.views().length;
      if (depth === this.depth) return;
      if (depth > this.depth) {
        this.titleEl()?.nativeElement.focus();
      } else {
        const opener = this.openers[depth - 1];
        if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
      }
      this.openers.length = depth - 1;
      this.depth = depth;
    });
  }

  /** Called by the service before a step is shown. */
  rememberOpener(): void {
    this.openers[this.root.views().length - 1] = document.activeElement;
  }

  goBack(): void {
    const r = this.top().ref;
    const back = r.back();
    if (back) back();
    else r.close();
  }
}
