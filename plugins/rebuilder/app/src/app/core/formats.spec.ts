import { BGA_TESTER_KEY, formatInfo, visibleFormats } from './formats';

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
