import { BREAKPOINTS, belowQuery, minWidthQuery, windowSizeFor } from './breakpoints';

describe('breakpoints (design system)', () => {
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
});
