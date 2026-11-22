/**
 * « Partager » on a guest deck, then « Se connecter »: the site's login reloads the page, so the editor remembers in
 * `sessionStorage` (this tab) which guest deck to move to the account and share once the user is back, signed in.
 */
export const SHARE_AFTER_SIGN_IN_KEY = 'arb.share-after-sign-in';
/** A sign-in abandoned for longer than this does not share the deck at the next one. */
export const SHARE_AFTER_SIGN_IN_TTL_MS = 30 * 60 * 1000;

export function rememberShareAfterSignIn(deckId: string, now = Date.now()): void {
  try {
    sessionStorage.setItem(SHARE_AFTER_SIGN_IN_KEY, JSON.stringify({ deckId, at: now }));
  } catch {
    // Storage blocked: the user shares again after signing in.
  }
}

/** `true` when `deckId` was waiting to be shared (the entry is removed either way, once read). */
export function takeShareAfterSignIn(deckId: string, now = Date.now()): boolean {
  try {
    const raw = sessionStorage.getItem(SHARE_AFTER_SIGN_IN_KEY);
    if (!raw) return false;
    const entry = JSON.parse(raw) as { deckId?: unknown; at?: unknown };
    if (entry.deckId !== deckId) return false;
    sessionStorage.removeItem(SHARE_AFTER_SIGN_IN_KEY);
    return typeof entry.at === 'number' && now - entry.at <= SHARE_AFTER_SIGN_IN_TTL_MS;
  } catch {
    return false;
  }
}
