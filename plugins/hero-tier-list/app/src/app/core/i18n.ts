import { loadTranslations } from '@angular/localize';

export type Locale = 'fr' | 'en';

/**
 * Interface language: the site's (`AlteredCore.lang`, a change reloads the page), set once at startup. Sources are
 * in French; `src/locale/messages.en.json` holds the English translations, loaded before the app modules evaluate so
 * that module-level `$localize` constants are translated too.
 */
let current: Locale = 'fr';

export function uiLocale(): Locale {
  return current;
}

export async function setUiLocale(locale: Locale): Promise<void> {
  current = locale;
  if (locale === 'en') {
    const { translations } = await import('../../locale/messages.en.json');
    loadTranslations(translations);
  }
}
