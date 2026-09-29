import type { LocationStrategy } from '@angular/common';
import type { Router } from '@angular/router';

/**
 * Absolute URL of a deck page. The app runs under the site page's base href (`/pages/rebuilder/`,
 * after the site's own `BASE_URL`), so the link goes through the location strategy, not `/decks/…`
 * at the origin.
 */
export function deckShareUrl(router: Router, location: LocationStrategy, id: string, origin = globalThis.location.origin): string {
  const path = location.prepareExternalUrl(router.serializeUrl(router.createUrlTree(['/decks', id])));
  return new URL(path, origin).href;
}
