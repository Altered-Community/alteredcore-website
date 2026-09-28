import { createApplication } from '@angular/platform-browser';
import { EmbedApp } from './embed-app/embed-app';
import { embedConfig } from './embed.config';
import { PLUGIN_ID, type AlteredCoreHost } from './host';

/**
 * Renders the editor into the mount point the site prepared. The root element sits inside the
 * shadow root, so Angular adds every component style there rather than to `document.head`.
 */
export async function bootstrapEmbedded(host: AlteredCoreHost): Promise<void> {
  const mount = host.getMount(PLUGIN_ID);
  mount.container.classList.add('ar-embed');
  const root = document.createElement('app-rebuilder-embed');
  mount.container.appendChild(root);
  host.on('theme', ({ theme }) => mount.container.setAttribute('data-theme', theme));

  const app = await createApplication(embedConfig(host, mount));
  app.bootstrap(EmbedApp, root);
}
