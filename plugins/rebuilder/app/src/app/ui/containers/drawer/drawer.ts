import { Component, input } from '@angular/core';
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
