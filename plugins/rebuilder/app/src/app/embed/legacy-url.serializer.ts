import { DefaultUrlSerializer, type UrlTree } from '@angular/router';

/** Deck page tabs (`decks/:id/<tab>`) and editor views (`decks/:id/edit/<view>`) of the routes. */
const DECK_TABS = new Set(['deck', 'description', 'main']);
const EDITOR_VIEWS = new Set(['apercu', 'deck', 'main']);

interface Parts {
  path: string[];
  query: URLSearchParams;
  hash: string;
}

function split(url: string): Parts {
  const u = new URL(url, 'http://x');
  return { path: u.pathname.split('/').filter(Boolean).map(decodeURIComponent), query: u.searchParams, hash: u.hash };
}

function join({ path, query, hash }: Parts): string {
  const q = query.toString();
  return `/${path.map(encodeURIComponent).join('/')}${q ? `?${q}` : ''}${hash}`;
}

/** `id` (and `tab` / `view`) first, then the other query parameters. */
function withId(id: string, key: string, value: string | undefined, rest: URLSearchParams): URLSearchParams {
  const query = new URLSearchParams({ id });
  if (value) query.set(key, value);
  rest.forEach((v, k) => query.append(k, v));
  return query;
}

/**
 * The site's URLs (under the base href `/pages/`) → the routes: `deck?id=X[&tab=…]` → `decks/X[/tab]`,
 * `deckbuilder?id=X[&view=…]` → `decks/X/edit[/view]`, `deckbuilder` → `decks/new`. The former links of the plugin's
 * own page (`rebuilder/decks/X`, `rebuilder?id=X`, `rebuilder/deck?id=X`) too; anything else is left as it is.
 */
export function toRouteUrl(url: string): string {
  const parts = split(url);
  let { path } = parts;
  const { query } = parts;
  if (path[0] === 'rebuilder') {
    path = path.slice(1);
    if (!path.length && query.has('id')) path = ['deckbuilder'];
    if (path[0] !== 'deck' && path[0] !== 'deckbuilder') return join({ ...parts, path });
  }
  if (path.length !== 1 || (path[0] !== 'deck' && path[0] !== 'deckbuilder')) return url;

  const id = query.get('id');
  const sub = query.get(path[0] === 'deck' ? 'tab' : 'view') ?? '';
  query.delete('id');
  query.delete(path[0] === 'deck' ? 'tab' : 'view');
  if (path[0] === 'deck') path = id ? ['decks', id, ...(DECK_TABS.has(sub) ? [sub] : [])] : ['decks'];
  else path = id ? ['decks', id, 'edit', ...(EDITOR_VIEWS.has(sub) ? [sub] : [])] : ['decks', 'new'];
  return join({ ...parts, path, query });
}

/** The routes → the site's URLs, the reverse of toRouteUrl(): the decks pages keep the links of the site's own pages. */
export function toSiteUrl(url: string): string {
  const parts = split(url);
  const [root, id, a, b] = parts.path;
  const n = parts.path.length;
  if (root !== 'decks' || n < 2) return url;
  if (id === 'new' && n === 2) return join({ ...parts, path: ['deckbuilder'] });
  if (n <= 3 && (n === 2 || DECK_TABS.has(a) || a === 'cartes')) {
    return join({ ...parts, path: ['deck'], query: withId(id, 'tab', DECK_TABS.has(a) ? a : undefined, parts.query) });
  }
  if (a === 'edit' && (n === 3 || (n === 4 && EDITOR_VIEWS.has(b)))) {
    return join({ ...parts, path: ['deckbuilder'], query: withId(id, 'view', b, parts.query) });
  }
  return url;
}

/**
 * Page URLs of the decks section: the site's (`/pages/deck?id=…`, `/pages/deckbuilder?id=…`), so a link shared from
 * Re:Builder opens the site's deck page when « Beta Deckbuilder » is off, and an old link opens Re:Builder when it is on.
 * The routes stay `decks/:id/…` inside the app.
 */
export class LegacyUrlSerializer extends DefaultUrlSerializer {
  override parse(url: string): UrlTree {
    return super.parse(toRouteUrl(url));
  }

  override serialize(tree: UrlTree): string {
    return toSiteUrl(super.serialize(tree));
  }
}
