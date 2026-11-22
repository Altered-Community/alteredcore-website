import { SHARE_AFTER_SIGN_IN_TTL_MS, rememberShareAfterSignIn, takeShareAfterSignIn } from './share-after-sign-in';

describe('share after sign-in', () => {
  beforeEach(() => sessionStorage.clear());

  it('shares the remembered guest deck once, back from the login', () => {
    rememberShareAfterSignIn('guest-1', 1000);
    expect(takeShareAfterSignIn('guest-2', 2000)).toBe(false);
    expect(takeShareAfterSignIn('guest-1', 2000)).toBe(true);
    expect(takeShareAfterSignIn('guest-1', 2000)).toBe(false);
  });

  it('forgets a sign-in abandoned for too long', () => {
    rememberShareAfterSignIn('guest-1', 0);
    expect(takeShareAfterSignIn('guest-1', SHARE_AFTER_SIGN_IN_TTL_MS + 1)).toBe(false);
  });
});
