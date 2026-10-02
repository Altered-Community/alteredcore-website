import { Component, computed, input, signal, type WritableSignal } from '@angular/core';
import { AcIcon } from '../../icon';

/** Which edge: `end` = the right edge of a panel at the start of the page, `start` = the reverse. */
export type AcDrawerSide = 'start' | 'end';

/**
 * Round handle on a side panel's inner edge, to hide it: `ac-drawer-handle`
 * (design-system/css/components/drawer.css). The panel is `position: relative` and does not clip it.
 */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- styles a native <button>
  selector: 'button[acDrawerHandle]',
  imports: [AcIcon],
  host: {
    type: 'button',
    class: 'ac-drawer-handle',
    '[class.ac-drawer-handle--end]': "acDrawerHandle() === 'end'",
    '[class.ac-drawer-handle--start]': "acDrawerHandle() === 'start'",
    'aria-expanded': 'true',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.title]': 'ariaLabel()',
  },
  templateUrl: './drawer-handle.html',
})
export class AcDrawerHandle {
  readonly acDrawerHandle = input.required<AcDrawerSide>();
  readonly ariaLabel = input.required<string>();
}

/**
 * Vertical tab on the page edge that shows a hidden side panel again: `ac-drawer-tab`. Content:
 * `<span class="ac-drawer-tab__label">`, then a summary (`ac-count`, a status icon).
 */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- styles a native <button>
  selector: 'button[acDrawerTab]',
  imports: [AcIcon],
  host: {
    type: 'button',
    class: 'ac-drawer-tab',
    '[class.ac-drawer-tab--start]': "acDrawerTab() === 'start'",
    '[class.ac-drawer-tab--end]': "acDrawerTab() === 'end'",
    'aria-expanded': 'false',
    '[attr.aria-label]': 'ariaLabel()',
  },
  templateUrl: './drawer-tab.html',
})
export class AcDrawerTab {
  readonly acDrawerTab = input.required<AcDrawerSide>();
  readonly ariaLabel = input<string | null>(null);
}

/** Longest wait for the leave motion's `animationend` (tab or panel hidden by other means, no event). */
const LEAVE_FALLBACK_MS = 400;

/**
 * Open / closed state of a side panel, with its motion in sequence: the element on screen (the
 * panel, or its tab) leaves with `ac-drawer-leave--<side>`, then the other one comes in with
 * `ac-drawer-enter--<side>`. Both are never in the layout together, so the content next to them
 * reflows once. No motion on page load, nor with `prefers-reduced-motion`.
 *
 * Template: `[class.ac-drawer-leave--start]="drawer.leaving()"`, `(animationend)="drawer.left($event)"`
 * and `[animate.enter]="drawer.enter()"` on both the panel and the tab.
 */
export class AcDrawerState {
  /** Set once the user has toggled the panel: the elements animate from then on. */
  readonly motion = signal(false);
  /** The element on screen is playing its leave motion. */
  readonly leaving = signal(false);
  readonly enter = computed(() => (this.motion() ? `ac-drawer-enter--${this.side}` : null));
  private fallback?: ReturnType<typeof setTimeout>;

  constructor(
    readonly open: WritableSignal<boolean>,
    private readonly side: AcDrawerSide,
    /** After the panel is shown or hidden (e.g. to move the focus). */
    private readonly changed?: (open: boolean) => void,
  ) {}

  set(next: boolean): void {
    if (next === this.open() || this.leaving()) return;
    this.motion.set(true);
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.flip();
      return;
    }
    this.leaving.set(true);
    this.fallback = setTimeout(() => this.done(), LEAVE_FALLBACK_MS);
  }

  /** `animationend` on the leaving element (events bubbling from its content are ignored). */
  left(event: AnimationEvent): void {
    if (event.target === event.currentTarget) this.done();
  }

  private done(): void {
    if (!this.leaving()) return;
    clearTimeout(this.fallback);
    this.leaving.set(false);
    this.flip();
  }

  private flip(): void {
    const next = !this.open();
    this.open.set(next);
    this.changed?.(next);
  }
}
