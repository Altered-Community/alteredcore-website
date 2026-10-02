/**
 * Layout breakpoints of the AlteredCore design system (design-system/tokens/breakpoints.ts):
 *   compact  < 768px   → bottom nav, filters in a sheet, overlays as sheets
 *   medium   768–1199  → centered dialogs
 *   expanded ≥ 1200    → three columns (filters · results · deck)
 *
 * CSS `@media` cannot read custom properties, so these literals are mirrored in component styles.
 * The density (pointer / touch) is the site's: `data-density` on <html>, see AcDensityService.
 */
import { BREAKPOINTS } from '../../../../../../design-system/tokens/breakpoints';

export { BREAKPOINTS };

export type WindowSize = 'compact' | 'medium' | 'expanded';

export function minWidthQuery(px: number): string {
  return `(min-width: ${px}px)`;
}

export function belowQuery(px: number): string {
  return `(max-width: ${px - 1}px)`;
}

export function windowSizeFor(width: number): WindowSize {
  if (width >= BREAKPOINTS.expanded) return 'expanded';
  if (width >= BREAKPOINTS.medium) return 'medium';
  return 'compact';
}
