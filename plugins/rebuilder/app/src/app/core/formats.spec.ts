import { BGA_TESTER_KEY, bgaTag, formatInfo, heroOnBga, visibleFormats } from './formats';

describe('visibleFormats', () => {
  afterEach(() => localStorage.clear());

  it('offers the hidden Test format only to the BGA test team (flag of /pages/bgatester)', () => {
    expect(visibleFormats().map((f) => f.value)).not.toContain('test');
    localStorage.setItem(BGA_TESTER_KEY, 'true');
    expect(visibleFormats().map((f) => f.value)).toContain('test');
  });

  it('names a Test deck whatever the flag', () => {
    expect(formatInfo('test').label).toBe('Test');
  });
});

describe('BGA availability of the hero', () => {
  it('flags a hero whose prints are all of sets missing from BGA, and the format tags', () => {
    expect(heroOnBga(['ALT_FUGUE_B_AX_130_C'])).toBe(false);
    expect(heroOnBga(['ALT_FUGUE_B_AX_130_C', 'ALT_CORE_B_AX_01_C'])).toBe(true);
    expect(bgaTag(formatInfo('standard'), true)).toEqual({ label: 'Héros indispo. BGA', tone: 'red' });
    expect(bgaTag(formatInfo('standard'), false).label).toBe('BGA');
    expect(bgaTag(formatInfo('singleton'), true).tone).toBe('red');
  });
});
