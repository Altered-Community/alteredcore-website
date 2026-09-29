import { loadTranslations } from '@angular/localize';
import type { Locale } from './models';

/**
 * Interface language. The sources are in French (`i18n` attributes, `$localize` with a custom
 * `@@id`); `src/locale/messages.en.json` holds the English translations. The language is the site's
 * (`AlteredCore.lang`, a change reloads the page), set once at startup: translations are loaded
 * before the app modules evaluate, so module-level `$localize` constants are translated too.
 */
let current: Locale = 'fr';

export function uiLocale(): Locale {
  return current;
}

/** Called once by `main.ts`, before the dynamic import of the app. */
export async function setUiLocale(locale: Locale): Promise<void> {
  current = locale;
  if (locale === 'en') {
    const { translations } = await import('../../locale/messages.en.json');
    loadTranslations(translations);
  }
}
