/** Default service URLs; the site's (`AlteredCore.services`) replace them at startup (`main.ts`). */
export const environment = {
  cardsApiUrl: 'https://cards.alteredcore.org',
  /** Uniques search (rust-cards-api, `/api/v2`): the Uniques tab. */
  uniquesApiUrl: 'https://search.altered.re',
  /**
   * `format=` id of the Frontier list on the Uniques search (`AlteredCore.uniquesFrontierFormat`): each season is its
   * own entry of the formats manifest (frontier, frontier_s04, …), the site's admin picks the active one.
   */
  uniquesFrontierFormat: 'frontier',
  decksApiUrl: 'https://decks.alteredcore.org',
  cdnUrl: 'https://cdn.alteredcore.org',
  /** Digital ownership (alt-art preferences), through the site's relay only: empty outside the site. */
  ownershipApiUrl: '',
  /** The site's base URL (`AlteredCore.baseUrl`, `''` at the domain root): links to its pages (card sheet). */
  siteUrl: '',
  /** CSRF token of the site session (`AlteredCore.csrf`): form posts to the site's plugin endpoints (favorites). */
  siteCsrf: '',
  /** The plugin's own PHP endpoints (`AlteredCore.page.apiUrl`, `/papi/rebuilder/`): empty outside the site. */
  pluginApiUrl: '',
};
