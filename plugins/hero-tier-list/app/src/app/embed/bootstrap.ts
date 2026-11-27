import { provideBrowserGlobalErrorListeners, ɵSHARED_STYLES_HOST as SHARED_STYLES_HOST } from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { TierListPage } from '../tier-list/tier-list-page/tier-list-page';
import { EMBED_MOUNT, PLUGIN_ID, type AlteredCoreHost } from './host';
import { ShadowStylesHost } from './shadow-styles.host';

/**
 * Renders the tier list into the mount point the site prepared. The root element sits inside the shadow root, so
 * Angular adds every component style there rather than to `document.head`.
 */
export async function bootstrapEmbedded(host: AlteredCoreHost): Promise<void> {
  const mount = host.getMount(PLUGIN_ID);
  const root = document.createElement('ac-hero-tier-list');
  mount.container.appendChild(root);

  const app = await createApplication({
    providers: [
      provideBrowserGlobalErrorListeners(),
      { provide: EMBED_MOUNT, useValue: mount },
      { provide: SHARED_STYLES_HOST, useClass: ShadowStylesHost },
    ],
  });
  app.bootstrap(TierListPage, root);
}
