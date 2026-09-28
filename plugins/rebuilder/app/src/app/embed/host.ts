import { InjectionToken } from '@angular/core';

/**
 * `window.AlteredCore`, version 1: the contract the AlteredCore site (the shell) publishes for
 * front-end plugins. Source of truth: `js/altered-core-host.js` and `plugins/README.html` in
 * the site repository.
 */
export interface AlteredCoreHost {
  readonly version: number;
  readonly baseUrl: string;
  readonly siteName: string;
  readonly lang: 'en' | 'fr';
  readonly theme: 'light' | 'dark';
  readonly user: AlteredCoreUser | null;
  readonly csrf: string;
  /** cards / cdn: public, called directly. decks / collection: the site's relay, which adds the token. */
  readonly services: { cards?: string; cdn?: string; decks?: string; collection?: string };
  /** apiUrl: the plugin's own PHP endpoints (`/papi/rebuilder/`, manifest "api"). */
  readonly page: { plugin: string; slug: string; basePath: string; subPath: string; assetsUrl: string; apiUrl: string; mount: 'shadow' | 'light' };
  /** window.fetch for same-origin calls, with the session cookie and X-CSRF-Token on writes. */
  fetch(url: string, init?: RequestInit): Promise<Response>;
  login(returnTo?: string): void;
  setTitle(title: string): void;
  /** Marks the site menu entry of a client route as current (shells from September 2026 on). */
  setActiveNav?(path: string | null): void;
  getMount(pluginId: string): AlteredCoreMount;
  on(type: 'theme', fn: (e: { theme: 'light' | 'dark' }) => void): () => void;
  on(type: 'lang', fn: (e: { lang: 'en' | 'fr' }) => void): () => void;
  on(type: 'auth', fn: (e: { user: AlteredCoreUser | null }) => void): () => void;
}

export interface AlteredCoreUser {
  id: number;
  username: string;
  sub: string | null;
}

export interface AlteredCoreMount {
  /** Element the shell rendered for the plugin. */
  host: HTMLElement;
  /** Its shadow root (`mount: shadow`), or the element itself. */
  root: ShadowRoot | HTMLElement;
  /** Element to render into; carries `data-theme` and `lang`. */
  container: HTMLElement;
}

/** Host contract versions this build understands. */
export const SUPPORTED_HOST_VERSION = 1;

export const PLUGIN_ID = 'rebuilder';

export const ALTERED_CORE = new InjectionToken<AlteredCoreHost>('ALTERED_CORE');
export const EMBED_MOUNT = new InjectionToken<AlteredCoreMount>('EMBED_MOUNT');

export function readHost(): AlteredCoreHost {
  const host = (globalThis as { AlteredCore?: AlteredCoreHost }).AlteredCore;
  if (!host) throw new Error('Re:Builder embed: window.AlteredCore is missing (load the page from the AlteredCore site).');
  if (host.version !== SUPPORTED_HOST_VERSION) {
    throw new Error(`Re:Builder embed: host contract v${host.version} is not supported (expected v${SUPPORTED_HOST_VERSION}).`);
  }
  return host;
}
