import { DefaultUrlSerializer, type UrlTree } from '@angular/router';

/**
 * The two site pages the routes map to: `deck?id=X[&tab=…]` ⇄ `decks/X[/tab]` and
 * `deckbuilder?id=X[&view=…]` ⇄ `decks/X/edit[/view]`; without an id, `deck` ⇄ `decks` and `deckbuilder` ⇄ `decks/new`.
 */
const PAGES = {
  deck: { key: 'tab', subs: new Set(['deck', 'description', 'main']), base: [] as string[], none: ['decks'] },
  deckbuilder: { key: 'view', subs: new Set(['apercu', 'deck', 'main']), base: ['edit'], none: ['decks', 'new'] },
};
type Page = keyof typeof PAGES;

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

/** The site's URLs (under the base href `/pages/`) → the routes; anything else is left as it is. */
export function toRouteUrl(url: string): string {
  if (!/^\/deck(builder)?([?#]|$)/.test(url)) return url;
  const parts = split(url);
  const page = PAGES[parts.path[0] as Page];
  const id = parts.query.get('id');
  const sub = parts.query.get(page.key) ?? '';
  parts.query.delete('id');
  parts.query.delete(page.key);
  const path = id ? ['decks', id, ...page.base, ...(page.subs.has(sub) ? [sub] : [])] : page.none;
  return join({ ...parts, path });
}

/** The routes → the site's URLs, the reverse of toRouteUrl(): the decks pages keep the links of the site's own pages. */
export function toSiteUrl(url: string): string {
  if (!url.startsWith('/decks/')) return url;
  const parts = split(url);
  const [, id, ...rest] = parts.path;
  if (id === 'new' && !rest.length) return join({ ...parts, path: ['deckbuilder'] });
  const name: Page = rest[0] === 'edit' ? 'deckbuilder' : 'deck';
  const page = PAGES[name];
  const subs = rest.slice(page.base.length);
  const sub = subs[0];
  if (subs.length > 1 || (sub !== undefined && !page.subs.has(sub) && !(name === 'deck' && sub === 'cartes'))) return url;
  const query = new URLSearchParams({ id });
  if (sub && page.subs.has(sub)) query.set(page.key, sub);
  parts.query.forEach((v, k) => query.append(k, v));
  return join({ ...parts, path: [name], query });
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
