export const environment = {
  production: true,
  cardsApiUrl: 'https://cards.alteredcore.org',
  decksApiUrl: 'https://decks.alteredcore.org',
  uniquesApiUrl: '',
  cdnUrl: 'https://cdn.alteredcore.org',
  /**
   * Confidential Keycloak client. The browser uses authorization code + PKCE.
   * The client secret is not configured here: the same-origin BFF holds it.
   */
  keycloakUrl: 'https://auth.altered.re',
  keycloakRealm: 'players',
  keycloakClientId: 'deckbuilder.yutsa.fr',
  authBffUrl: '/auth',
};
