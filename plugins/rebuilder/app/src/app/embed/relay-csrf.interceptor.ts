import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ALTERED_CORE } from './host';

/** Writes through the site's relay (decks, collection) need the session's CSRF token. */
export const relayCsrfInterceptor: HttpInterceptorFn = (req, next) => {
  const host = inject(ALTERED_CORE);
  const relays = [host.services.decks, host.services.collection].filter((u): u is string => !!u && u.startsWith('/'));
  const write = req.method !== 'GET' && req.method !== 'HEAD';
  if (!write || !relays.some((base) => req.url.startsWith(base + '/'))) return next(req);
  return next(req.clone({ setHeaders: { 'X-CSRF-Token': host.csrf } }));
};
