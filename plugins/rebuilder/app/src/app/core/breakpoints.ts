/**
 * Layout breakpoints from design/tokens/tokens.css:
 *   compact  < 768px   → bottom nav, filters in a sheet, overlays as sheets
 *   medium   768–1199  → touch density, centered dialogs
 *   expanded ≥ 1200    → pointer density, three columns (filters · results · deck)
 *
 * CSS `@media` cannot read custom properties, so these literals are mirrored in component styles.
 */
export const BREAKPOINTS = {
  medium: 768,
  expanded: 1200,
} as const;

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

/** touch when the pointer is coarse or the window is compact (tokens.css header). */
export function densityFor(width: number, coarsePointer: boolean): 'pointer' | 'touch' {
  return coarsePointer || width < BREAKPOINTS.medium ? 'touch' : 'pointer';
}
