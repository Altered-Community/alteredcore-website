import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';

/**
 * The Lucide icons this plugin uses (lucide-static, ISC), inlined: same names and markup as `ac_icon()` / `acIcon()`
 * on the site and `<ac-icon>` in Re:Builder. To add one, copy its inner markup from design-system/icons/sprite.svg.
 */
export const AC_ICONS = {
  'download': '<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>',
  'undo-2': '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/>',
  'redo-2': '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13"/>',
  'rotate-ccw': '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  'pencil': '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
  'plus': '<path d="M5 12h14"/><path d="M12 5v14"/>',
  'trash-2': '<path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  'x': '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  'chevron-up': '<path d="m18 15-6-6-6 6"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-left': '<path d="m15 18-6-6 6-6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'search': '<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>',
  'check': '<path d="M20 6 9 17l-5-5"/>',
  'circle-alert': '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
  'loader-circle': '<path d="M21 12a9 9 0 1 1-6.219-8.56"/>',
} as const;

export type AcIconName = keyof typeof AC_ICONS;

const cache = new Map<string, SafeHtml>();

/**
 * `<ac-icon name="trash-2" />`: renders `<svg class="ac-icon">` (design-system/css/components/icon.css).
 * The host element is `display: contents`, so the SVG is the box that layouts and selectors see;
 * `size` sets `--ac-icon-size`, `strokeWidth` sets `--ac-icon-stroke`.
 */
@Component({
  selector: 'ac-icon',
  host: {
    'aria-hidden': 'true',
    style: 'display: contents',
    '[innerHTML]': 'svg()',
  },
  templateUrl: './icon.html',
})
export class AcIcon {
  private readonly sanitizer = inject(DomSanitizer);
  readonly name = input.required<AcIconName>();
  readonly size = input<number>(16);
  readonly strokeWidth = input<number>(2);

  protected readonly svg = computed(() => {
    const name = this.name();
    const key = `${name}|${this.size()}|${this.strokeWidth()}`;
    let out = cache.get(key);
    if (!out) {
      out = this.sanitizer.bypassSecurityTrustHtml(
        `<svg class="ac-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" ` +
          `fill="none" stroke="currentColor" ` +
          `stroke-linecap="round" stroke-linejoin="round" ` +
          `style="--ac-icon-size: ${this.size()}px; --ac-icon-stroke: ${this.strokeWidth()}">${AC_ICONS[name]}</svg>`,
      );
      cache.set(key, out);
    }
    return out;
  });
}
