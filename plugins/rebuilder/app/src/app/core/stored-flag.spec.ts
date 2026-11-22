import { storedFlag } from './stored-flag';

describe('storedFlag', () => {
  const key = 'rebuilder.test.flag';
  afterEach(() => localStorage.removeItem(key));

  it('starts from the default when nothing is stored', () => {
    expect(storedFlag(key, true)()).toBe(true);
  });

  it('remembers the last value', () => {
    storedFlag(key, true).set(false);
    expect(localStorage.getItem(key)).toBe('false');
    expect(storedFlag(key, true)()).toBe(false);
  });

  it('ignores a stored value that is not a boolean', () => {
    localStorage.setItem(key, 'yes');
    expect(storedFlag(key, false)()).toBe(false);
  });
});
