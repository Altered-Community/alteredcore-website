import { Component, ElementRef, input, model, viewChildren } from '@angular/core';
import { nextId } from '../../fields/value-accessor';

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
  protected readonly idPrefix = nextId('ac-tab');
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
