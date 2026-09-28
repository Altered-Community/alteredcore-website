import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ALTERED_CORE } from './host';

/**
 * Writes to the site need the session's CSRF token: the relay (services.decks / .collection) and
 * the plugin's own PHP endpoints (page.apiUrl). Public services (cards, CDN) never get it.
 */
export const siteCsrfInterceptor: HttpInterceptorFn = (req, next) => {
  const host = inject(ALTERED_CORE);
  const bases = [host.services.decks, host.services.collection, host.page.apiUrl]
    .filter((u): u is string => !!u && u.startsWith('/'))
    .map((u) => (u.endsWith('/') ? u : u + '/'));
  const write = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  if (!write || !bases.some((base) => req.url.startsWith(base))) return next(req);
  return next(req.clone({ setHeaders: { 'X-CSRF-Token': host.csrf } }));
};
