import { environment } from '../../environments/environment';
import { assetUrl } from './asset-url';
import { contentLocale } from './locale';
import type { Locale } from './models';

const CDN = environment.cdnUrl.replace(/\/$/, '');

/** Local fallback from alteredcore-website `plugins/core-altered-cards/assets/img`. */
export const CARD_BACK = assetUrl('assets/img/cardback.webp');

export function setOfReference(ref: string): string {
  return ref.split('_')[1] ?? '';
}

const UNIQUE_REF = /^(ALT_([A-Z0-9]+)_[A-Z]+_[A-Z]{2}_\d+)_U(?:_\d+)?$/;

export function isUniqueReference(ref: string): boolean {
  return UNIQUE_REF.test(ref);
}

/** Printed card a unique belongs to: ALT_EOLE_B_OR_109_U_374 → ALT_EOLE_B_OR_109. */
export function uniqueCardId(ref: string): string | null {
  return UNIQUE_REF.exec(ref)?.[1] ?? null;
}

/** CDN card image, `{CDN_URL}/cards/{lang}/{SET}/{REFERENCE}.webp` (docs/backend-api.md). */
export function cardImageUrl(ref: string, locale: Locale = contentLocale()): string {
  return `${CDN}/cards/${locale}/${setOfReference(ref)}/${ref}.webp`;
}

/**
 * Unique illustration, shared by every unique of a printed card (not the common art).
 * Each unique only differs by its stats and effects, so there is no per-unique image: the CDN has
 * no `cards/{lang}/…/…_U_374.webp` and the API `imagePath` (Equinox S3) answers 403.
 * Same order as Altered-Card-Renderer: the frameless art cut for the frame (`T1`…`T4`), the CORE
 * copy for Kickstarter cards (some are missing), then `cards/assets/`, which covers every set.
 */
export function uniqueArtSources(ref: string, frame = 'T1'): string[] {
  const id = uniqueCardId(ref);
  if (!id) return [CARD_BACK];
  const set = setOfReference(ref);
  const out = [`${CDN}/illustrations/${set}/${id}_U_FRAMELESS_${frame}.webp`];
  if (set === 'COREKS') out.push(`${CDN}/illustrations/CORE/${id.replace('_COREKS_', '_CORE_')}_U_FRAMELESS_${frame}.webp`);
  out.push(`${CDN}/cards/assets/${set}/${id}_U.webp`, CARD_BACK);
  return out;
}

/** Ordered sources for an <img>: the card image (the unique illustration for uniques), then the card back. */
export function cardImageSources(ref: string, locale: Locale = contentLocale()): string[] {
  return isUniqueReference(ref) ? uniqueArtSources(ref) : [cardImageUrl(ref, locale), CARD_BACK];
}

/**
 * Small monochrome set mark from alteredcore-website `assets/font/alteredicons`
 * (the `fa-kit` glyph stored on each set in `data/altered.json`). Not the set art
 * in `plugins/core-altered-cards/assets/set/small_bg`.
 */
export function setImageUrl(setRef: string): string {
  return assetUrl(`assets/set-logos/${setRef}.svg`);
}
