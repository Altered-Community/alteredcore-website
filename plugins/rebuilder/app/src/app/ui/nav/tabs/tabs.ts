import { Component, input, model } from '@angular/core';

export interface AcTab {
  id: string;
  label: string;
  count?: number;
}

/** Tabs: underline (≥ medium) or scrolling pills (compact), `ac-tabs` (design-system/css/components/navigation.css). */
@Component({
  selector: 'ac-tabs',
  host: {
    role: 'tablist',
    class: 'ac-tabs',
    '[attr.aria-label]': 'ariaLabel()',
    '[class.ac-tabs--underline]': "appearance() === 'underline'",
    '[class.ac-tabs--pill]': "appearance() === 'pill'",
  },
  templateUrl: './tabs.html',
  styleUrl: './tabs.scss',
})
export class AcTabs {
  readonly tabs = input<AcTab[]>([]);
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
