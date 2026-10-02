import type { LocationStrategy } from '@angular/common';
import type { Router } from '@angular/router';

/**
 * Absolute URL of a deck page: the site's deck page link (`/pages/deck?id=…`, LegacyUrlSerializer), which opens
 * Re:Builder or the site's deck page depending on the visitor's « Beta Deckbuilder ». It goes through the location
 * strategy for the base href (`/pages/`, after the site's own `BASE_URL`).
 */
export function deckShareUrl(router: Router, location: LocationStrategy, id: string, origin = globalThis.location.origin): string {
  const path = location.prepareExternalUrl(router.serializeUrl(router.createUrlTree(['/decks', id])));
  return new URL(path, origin).href;
}
