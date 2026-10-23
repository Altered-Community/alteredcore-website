import { deckUrl } from '../core/api-urls';
import { contentLocale } from '../core/locale';
import type { AlteredCoreHost } from './host';

/** A prefetched answer, read in full: an unread body would keep its request open. */
export interface PrefetchedAnswer {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  url: string;
  body: string;
}

/**
 * Requests started by `main.ts` while the app's modules download, so that their answers are on their way, or
 * here, when the app asks for them: on a slow network the modules take seconds, and the page's data used to
 * wait for them. `prefetchInterceptor` hands an answer to the app's request for the same URL, once; a failed or
 * refused answer is dropped and the app sends its own request, which handles the error as usual.
 * Kept out of Angular (no HttpClient): main.ts loads it before the app.
 */
const pending = new Map<string, Promise<PrefetchedAnswer | null>>();

export function prefetch(url: string): void {
  if (pending.has(url)) return;
  pending.set(
    url,
    fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(async (res) => {
        const body = await res.text();
        if (!res.ok) return null;
        const headers: Record<string, string> = {};
        res.headers.forEach((value, name) => (headers[name] = value));
        return { status: res.status, statusText: res.statusText, headers, url: res.url, body };
      })
      .catch(() => null),
  );
}

/** The prefetched answer for `url` (null when it failed), once; undefined when nothing was prefetched. */
export function takePrefetched(url: string): Promise<PrefetchedAnswer | null> | undefined {
  const answer = pending.get(url);
  pending.delete(url);
  return answer;
}

/** Forgets every prefetched answer (tests). */
export function clearPrefetched(): void {
  pending.clear();
}

/**
 * The first request of the page the site served, when it does not depend on the app's state: the deck of the deck
 * page and of the editor (`deck?id=…`, `deckbuilder?id=…`, see LegacyUrlSerializer). Guest decks live in this
 * browser.
 */
export function prefetchPage(host: AlteredCoreHost, search = location.search): void {
  const decks = host.services.decks;
  if (!decks || (host.page.slug !== 'deck' && host.page.slug !== 'deckbuilder')) return;
  const id = new URLSearchParams(search).get('id');
  if (!id || id.startsWith('guest-')) return;
  prefetch(deckUrl(decks, id, contentLocale()));
}
