import { gemSrc } from './assets';

describe('gemSrc', () => {
  it('maps API rarity names to PHP site gem files', () => {
    expect(gemSrc('COMMON')).toBe('assets/gems/C.png');
    expect(gemSrc('rare')).toBe('assets/gems/R.png');
    expect(gemSrc('UNIQUE')).toBe('assets/gems/U.png');
    expect(gemSrc('EXALTED')).toBe('assets/gems/E.png');
  });
});
