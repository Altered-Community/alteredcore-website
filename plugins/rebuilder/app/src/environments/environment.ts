/** Default service URLs; the site's (`AlteredCore.services`) replace them at startup (`main.ts`). */
export const environment = {
  cardsApiUrl: 'https://cards.alteredcore.org',
  /** Uniques search (rust-cards-api, `/api/v2`): the Uniques tab. */
  uniquesApiUrl: 'https://search.altered.re',
  decksApiUrl: 'https://decks.alteredcore.org',
  cdnUrl: 'https://cdn.alteredcore.org',
  /** Digital ownership (alt-art preferences), through the site's relay only: empty outside the site. */
  ownershipApiUrl: '',
  /** The plugin's own PHP endpoints (`AlteredCore.page.apiUrl`, `/papi/rebuilder/`): empty outside the site. */
  pluginApiUrl: '',
};
