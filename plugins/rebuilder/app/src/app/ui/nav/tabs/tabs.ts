import { CdkMenu, CdkMenuItemRadio, CdkMenuTrigger } from '@angular/cdk/menu';
import { Component, ElementRef, computed, input, model, viewChildren } from '@angular/core';
import { nextId } from '../../fields/value-accessor';
import { AcIcon } from '../../icon';

export interface AcTab {
  id: string;
  label: string;
  /** Label in the tab row when `maxTabs` is set (the « Plus » menu shows `label`). */
  short?: string;
  count?: number;
}

/**
 * Tabs: underline or scrolling pills, `ac-tabs` (design-system/css/components/navigation.css).
 * With `maxTabs`, the tabs share the row (`ac-tabs--fill`) and the ones after it go in a « Plus »
 * menu (CDK menu, `ac-menu`); the « Plus » tab shows the picked one.
 */
@Component({
  selector: 'ac-tabs',
  imports: [AcIcon, CdkMenuTrigger, CdkMenu, CdkMenuItemRadio],
  host: {
    role: 'tablist',
    class: 'ac-tabs',
    '[attr.aria-label]': 'ariaLabel()',
    '[class.ac-tabs--underline]': "appearance() === 'underline'",
    '[class.ac-tabs--pill]': "appearance() === 'pill'",
    '[class.ac-tabs--fill]': 'maxTabs() !== null',
  },
  templateUrl: './tabs.html',
  styleUrl: './tabs.scss',
})
export class AcTabs {
  readonly tabs = input<AcTab[]>([]);
  readonly active = model<string>('');
  readonly appearance = input<'underline' | 'pill'>('underline');
  readonly ariaLabel = input('');
  /** Tabs shown in the row; the others go in the « Plus » menu. */
  readonly maxTabs = input<number | null>(null);
  readonly moreLabel = input($localize`:@@ui.tabs.more:Plus`);
  protected readonly idPrefix = nextId('ac-tab');
  /** By reference: in the embed the tabs live in a shadow root, out of `document.getElementById`'s reach. */
  private readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('tab');

  protected readonly shown = computed(() => {
    const max = this.maxTabs();
    const all = this.tabs();
    return max === null || all.length <= max ? all : all.slice(0, max);
  });
  protected readonly overflow = computed(() => this.tabs().slice(this.shown().length));
  protected readonly picked = computed(() => this.overflow().find((t) => t.id === this.active()) ?? null);
  protected readonly short = computed(() => this.maxTabs() !== null);

  /** Arrow keys from the button at `from`: a tab becomes active, the « Plus » tab only takes the focus. */
  step(from: number, delta: number): void {
    const ids = this.shown().map((t) => t.id);
    const count = ids.length + (this.overflow().length ? 1 : 0);
    if (!count) return;
    const n = (from + delta + count) % count;
    if (n < ids.length) this.active.set(ids[n]);
    this.buttons()[n]?.nativeElement.focus();
  }
}
