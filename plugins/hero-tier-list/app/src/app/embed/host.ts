import { InjectionToken } from '@angular/core';

/**
 * The part of `window.AlteredCore` (version 1) this plugin reads. Source of truth: `js/altered-core-host.js`
 * and `plugins/README.html` in the site repository; the full contract is in
 * `plugins/rebuilder/app/src/app/embed/host.ts`.
 */
export interface AlteredCoreHost {
  readonly version: number;
  readonly lang: 'en' | 'fr';
  readonly services: { cards?: string; cdn?: string };
  getMount(pluginId: string): AlteredCoreMount;
}

export interface AlteredCoreMount {
  /** Element the shell rendered for the plugin. */
  host: HTMLElement;
  /** Its shadow root (`mount: shadow`), or the element itself. */
  root: ShadowRoot | HTMLElement;
  /** Element to render into; carries `data-theme` and `lang`. */
  container: HTMLElement;
}

export const SUPPORTED_HOST_VERSION = 1;
export const PLUGIN_ID = 'hero-tier-list';

export const EMBED_MOUNT = new InjectionToken<AlteredCoreMount>('EMBED_MOUNT');

export function readHost(): AlteredCoreHost {
  const host = (globalThis as { AlteredCore?: AlteredCoreHost }).AlteredCore;
  if (!host) throw new Error('Hero tier list: window.AlteredCore is missing (load the page from the AlteredCore site).');
  if (host.version !== SUPPORTED_HOST_VERSION) {
    throw new Error(`Hero tier list: host contract v${host.version} is not supported (expected v${SUPPORTED_HOST_VERSION}).`);
  }
  return host;
}
