/**
 * Service URLs used until the site's values are read: `main.embed.ts` replaces them with
 * `window.AlteredCore.services` (cards, decks relay, CDN) before the app modules evaluate.
 */
export const environment = {
  cardsApiUrl: 'https://cards.alteredcore.org',
  decksApiUrl: 'https://decks.alteredcore.org',
  cdnUrl: 'https://cdn.alteredcore.org',
};
