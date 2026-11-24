import { ALL_CARDS_SETS } from './card-filters';
import { cardImageUrl, isUniqueReference, uniqueArtSources } from './card-art';
import { guessCanonical, printKey, printParts } from './deck-prints';
import type { Card, Locale } from './models';
import { localizedText } from './models';

/**
 * Card suggestions of the community tab's « Carte » filter, from the search API (`/api/v2/search`). The decks API's
 * `cardReference` filter matches the canonical reference a deck stores (booster print of the card's first set, a Unique
 * its own), so a suggestion is one gameplay card (family + rarity) and carries that reference.
 */
export interface CardSuggestion {
  /** Canonical reference: what the decks API filters on. */
  reference: string;
  name: string;
  /** `C`, `R1`, `R2`, `E`, `U`. */
  rarity: string;
  faction: string;
  /** Thumbnail: the card image, the shared illustration for a Unique. */
  image: string;
}

/** A full card reference (`ALT_CORE_B_AX_04_R1`, `ALT_BISE_B_LY_49_U_123`), any case. */
const REFERENCE = /^ALT_[A-Z0-9]+_[A-Z]+_[A-Z]{2}_\d+_[A-Z]\d*(?:_\d+)?$/i;

export function looksLikeReference(q: string): boolean {
  return REFERENCE.test(q.trim());
}

/**
 * The canonical reference of a print: `guessCanonical`, or for an alt art / promo of a set the booster print of the same
 * set (`ALT_CORE_A_AX_04_R1` → `ALT_CORE_B_AX_04_R1`, `COREKS` → `CORE`).
 */
export function canonicalOf(reference: string): string {
  const ref = reference.trim().toUpperCase();
  const known = guessCanonical(ref);
  if (known) return known;
  const p = printParts(ref);
  if (!p) return ref;
  return guessCanonical(ref.replace(`_${p.set}_${p.product}_`, `_${p.set}_B_`)) ?? ref;
}

/** Older sets last in `ALL_CARDS_SETS`: the higher, the older (unknown sets count as the newest). */
function setAge(reference: string): number {
  return ALL_CARDS_SETS.indexOf(printParts(reference)?.set ?? '');
}

const RARITY_ORDER = ['C', 'R1', 'R2', 'E', 'U'];

/**
 * One suggestion per gameplay card (family + rarity), on its canonical reference (the oldest booster print of the
 * results). Names that start with `query` first, then by name, then common → rare → exalted.
 */
export function toSuggestions(cards: readonly Card[], query: string, locale: Locale, limit = 12): CardSuggestion[] {
  const byCard = new Map<string, Card>();
  for (const card of cards) {
    const ref = card.reference.toUpperCase();
    const key = printKey(ref);
    const kept = byCard.get(key);
    const booster = guessCanonical(ref) !== null;
    const keptBooster = kept ? guessCanonical(kept.reference.toUpperCase()) !== null : false;
    if (!kept || (booster && !keptBooster) || (booster === keptBooster && setAge(ref) > setAge(kept.reference))) byCard.set(key, card);
  }
  const q = query.trim().toLowerCase();
  const out = [...byCard.values()].map((card): CardSuggestion => {
    const reference = canonicalOf(card.reference);
    const p = printParts(reference);
    return {
      reference,
      name: localizedText(card.name, locale) || reference,
      rarity: p?.rarity ?? '',
      faction: card.faction?.code ?? p?.faction ?? '',
      image: isUniqueReference(reference) ? uniqueArtSources(reference)[0] : cardImageUrl(reference, locale),
    };
  });
  const starts = (s: CardSuggestion) => (q && s.name.toLowerCase().startsWith(q) ? 0 : 1);
  return out
    .sort(
      (a, b) =>
        starts(a) - starts(b) ||
        a.name.localeCompare(b.name, locale) ||
        RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity),
    )
    .slice(0, limit);
}
