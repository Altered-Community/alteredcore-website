/**
 * Entry point of the plugin `hero-tier-list`, mounted by the AlteredCore site (`npm run build`). The site publishes
 * `window.AlteredCore`; its service URLs and language must be known, and the translations loaded, before the app
 * modules evaluate, hence the dynamic import.
 */
import { setUiLocale } from './app/core/i18n';
import { readHost } from './app/embed/host';
import { environment } from './environments/environment';

const host = readHost();
const env = environment as { -readonly [K in keyof typeof environment]: (typeof environment)[K] };
env.cardsApiUrl = host.services.cards || env.cardsApiUrl;
env.cdnUrl = host.services.cdn || env.cdnUrl;

setUiLocale(host.lang)
  .then(() => import('./app/embed/bootstrap'))
  .then((m) => m.bootstrapEmbedded(host))
  .catch((err) => console.error('Hero tier list failed to start', err));
