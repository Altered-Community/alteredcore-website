/**
 * Breakpoints of the AlteredCore design system, for code (BreakpointObserver, matchMedia).
 * Keep in sync with breakpoints.scss — tests/DesignSystemTest.php checks it.
 *   compact  < 768px, medium 768–1199px, expanded ≥ 1200px
 */
export const BREAKPOINTS = {
  medium: 768,
  expanded: 1200,
} as const;
