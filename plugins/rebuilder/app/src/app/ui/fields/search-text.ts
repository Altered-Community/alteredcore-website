/** Text compared by the list searches: lower case, accents removed (« épuisé » finds « Épuisé »). */
export function normalizeSearch(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
