/**
 * URL of a deck as DecksApiService.get() requests it (`urlWithParams`), `GET {decks}/api/decks/{id}?locale=…`:
 * embed/prefetch.ts requests it before the app starts, and the app takes the prefetched answer only for the same
 * string (api-urls.spec.ts).
 */
export function deckUrl(base: string, id: string, locale: string): string {
  return `${base.replace(/\/$/, '')}/api/decks/${encodeURIComponent(id)}?locale=${encodeURIComponent(locale)}`;
}
