/**
 * Entry point of the plugin `rebuilder`, mounted by the AlteredCore site (`npm run build`). The site
 * publishes `window.AlteredCore`; its service URLs, language and asset location must be known, and its
 * translations loaded, before the app modules evaluate, hence the dynamic import.
 */
import { setAssetBase } from './app/core/asset-url';
import { setUiLocale } from './app/core/i18n';
import { setContentLocale } from './app/core/locale';
import { readHost } from './app/embed/host';
import { prefetchPage } from './app/embed/prefetch';
import { environment } from './environments/environment';

const host = readHost();
const env = environment as { -readonly [K in keyof typeof environment]: (typeof environment)[K] };
env.cardsApiUrl = host.services.cards || env.cardsApiUrl;
env.uniquesApiUrl = host.services.uniques || env.uniquesApiUrl;
env.decksApiUrl = host.services.decks || env.decksApiUrl;
env.cdnUrl = host.services.cdn || env.cdnUrl;
env.ownershipApiUrl = host.services.ownership || env.ownershipApiUrl;
env.pluginApiUrl = host.page.apiUrl || env.pluginApiUrl;
env.siteUrl = host.baseUrl ?? env.siteUrl;
env.siteCsrf = host.csrf ?? env.siteCsrf;
setAssetBase(host.page.assetsUrl);
setContentLocale(host.lang);
// The page's data, requested while the app's modules download (embed/prefetch.ts).
prefetchPage(host);

setUiLocale(host.lang)
  .then(() => import('./app/embed/bootstrap'))
  .then((m) => m.bootstrapEmbedded(host))
  .catch((err) => console.error('Re:Builder embed failed to start', err));
