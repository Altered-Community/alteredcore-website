import { Component, ElementRef, input, model, viewChildren } from '@angular/core';
import { nextId } from '../../fields/value-accessor';

export interface ArTab {
  id: string;
  label: string;
  count?: number;
}

/** Tabs: underline (≥ medium) or scrolling pills (compact). */
@Component({
  selector: 'ar-tabs',
  host: { role: 'tablist', '[attr.aria-label]': 'ariaLabel()', '[class]': "'ar-tabs--' + appearance()" },
  templateUrl: './tabs.html',
  styleUrl: './tabs.scss',
})
export class ArTabs {
  readonly tabs = input<ArTab[]>([]);
  readonly active = model<string>('');
  readonly appearance = input<'underline' | 'pill'>('underline');
  readonly ariaLabel = input('');
  protected readonly idPrefix = nextId('ar-tab');
  /** By reference: in the embed the tabs live in a shadow root, out of `document.getElementById`'s reach. */
  private readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('tab');

  step(delta: number): void {
    const list = this.tabs();
    const i = list.findIndex((t) => t.id === this.active());
    const n = (i + delta + list.length) % list.length;
    if (!list[n]) return;
    this.active.set(list[n].id);
    this.buttons()[n]?.nativeElement.focus();
  }
}
