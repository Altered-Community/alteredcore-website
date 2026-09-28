/**
 * Local `ng serve` defaults to the same production AlteredCore APIs the PHP
 * deckbuilder uses. Point these at a local Aspire/docker stack when one is up.
 *
 * See `.env.example` and `docs/backend-api.md`.
 */
export const environment = {
  production: false,
  cardsApiUrl: 'https://cards.alteredcore.org',
  decksApiUrl: 'https://decks.alteredcore.org',
  uniquesApiUrl: '',
  cdnUrl: 'https://cdn.alteredcore.org',
  keycloakUrl: 'https://auth.altered.re',
  keycloakRealm: 'players',
  keycloakClientId: 'deckbuilder.yutsa.fr',
  /** Dev server proxies this to the local auth BFF. No client secret in the SPA. */
  authBffUrl: '/auth',
};
