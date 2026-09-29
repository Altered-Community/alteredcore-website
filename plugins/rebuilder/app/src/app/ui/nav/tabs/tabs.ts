import { Component, input, model } from '@angular/core';

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

  step(delta: number): void {
    const list = this.tabs();
    const i = list.findIndex((t) => t.id === this.active());
    const next = list[(i + delta + list.length) % list.length];
    if (next) {
      this.active.set(next.id);
      queueMicrotask(() => document.getElementById('tab-' + next.id)?.focus());
    }
  }
}
