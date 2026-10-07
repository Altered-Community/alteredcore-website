import { toRouteUrl } from './legacy-url.serializer';

/**
 * The page a URL of the router shows: the decks list, the new deck page, a deck, a deck's editor. The tabs of a deck
 * and the views of its editor are the same page; so are the list's tabs and filters (query parameters).
 */
export function pageOf(url: string): string {
  const path = toRouteUrl(url).split(/[?#]/)[0].split('/').filter(Boolean);
  const edit = path.indexOf('edit');
  return path.slice(0, edit >= 0 ? edit + 1 : 2).join('/');
}
