import { BREAKPOINTS, belowQuery, densityFor, minWidthQuery, windowSizeFor } from './breakpoints';

describe('breakpoints (design tokens)', () => {
  it('uses the design pack thresholds 768 / 1200', () => {
    expect(BREAKPOINTS.medium).toBe(768);
    expect(BREAKPOINTS.expanded).toBe(1200);
    expect(minWidthQuery(768)).toBe('(min-width: 768px)');
    expect(belowQuery(768)).toBe('(max-width: 767px)');
  });

  it('maps widths to window sizes', () => {
    expect(windowSizeFor(390)).toBe('compact');
    expect(windowSizeFor(767)).toBe('compact');
    expect(windowSizeFor(768)).toBe('medium');
    expect(windowSizeFor(1199)).toBe('medium');
    expect(windowSizeFor(1440)).toBe('expanded');
  });

  it('switches to touch density on coarse pointers or compact widths', () => {
    expect(densityFor(390, false)).toBe('touch');
    expect(densityFor(1440, false)).toBe('pointer');
    expect(densityFor(1440, true)).toBe('touch');
  });
});
