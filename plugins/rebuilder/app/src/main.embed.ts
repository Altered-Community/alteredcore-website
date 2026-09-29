/**
 * Entry point of the build embedded in the AlteredCore site (`npm run build:embed`, plugin
 * `rebuilder`). The site publishes `window.AlteredCore`; its service URLs, language and asset
 * location must be known, and its translations loaded, before the app modules evaluate, hence the dynamic import.
 */
import { setAssetBase } from './app/core/asset-url';
import { setUiLocale } from './app/core/i18n';
import { setContentLocale } from './app/core/locale';
import { readHost } from './app/embed/host';
import { environment } from './environments/environment';

const host = readHost();
const env = environment as { -readonly [K in keyof typeof environment]: (typeof environment)[K] };
env.cardsApiUrl = host.services.cards || env.cardsApiUrl;
env.decksApiUrl = host.services.decks || env.decksApiUrl;
env.cdnUrl = host.services.cdn || env.cdnUrl;
setAssetBase(host.page.assetsUrl);
setContentLocale(host.lang);

setUiLocale(host.lang)
  .then(() => import('./app/embed/bootstrap'))
  .then((m) => m.bootstrapEmbedded(host))
  .catch((err) => console.error('Re:Builder embed failed to start', err));
