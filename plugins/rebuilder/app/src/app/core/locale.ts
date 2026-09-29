import type { Locale } from './models';

let current: Locale = 'fr';

/**
 * Language of the card data (names, effects, card images): the site language
 * (`AlteredCore.lang`), set once at startup.
 */
export function contentLocale(): Locale {
  return current;
}

export function setContentLocale(locale: Locale): void {
  current = locale;
}
