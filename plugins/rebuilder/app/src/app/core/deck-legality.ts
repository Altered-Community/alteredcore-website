import type { DeckStatus, LegalityRule } from './deck-rules';
import type { Deck } from './models';

/**
 * Legality shown on the deck page. `unknown`: the decks API says `legal: false` without any failed
 * check (a freshly imported draft, legality not computed yet): no badge, as on the site.
 */
export interface DeckLegality {
  state: 'legal' | 'illegal' | 'unknown';
  /** Failed rules (`legalityDetail` keys, or the editor's own checks for a guest deck). */
  rules: string[];
  /** `formatErrors` of the decks API, as is. */
  errors: string[];
}

const RULE_LABELS: Record<LegalityRule, string> = {
  hero: $localize`:@@core.legality.hero:Héros manquant ou invalide`,
  deckSize: $localize`:@@core.legality.deckSize:Nombre de cartes invalide`,
  faction: $localize`:@@core.legality.faction:Cartes de plusieurs factions`,
  sets: $localize`:@@core.legality.sets:Cartes de sets non autorisés`,
  bannedCards: $localize`:@@core.legality.bannedCards:Contient des cartes bannies`,
  suspendedCards: $localize`:@@core.legality.suspendedCards:Contient des cartes suspendues`,
  copies: $localize`:@@core.legality.copies:Trop de copies d’un même nom`,
  uniqueQuantity: $localize`:@@core.legality.uniqueQuantity:Trop de cartes uniques`,
  rareQuantity: $localize`:@@core.legality.rareQuantity:Trop de cartes rares`,
  exaltedQuantity: $localize`:@@core.legality.exaltedQuantity:Trop de cartes exaltées`,
};

/** Label of a failed rule; an unknown key is shown as is. */
export function legalityRuleLabel(rule: string): string {
  return RULE_LABELS[rule as LegalityRule] ?? rule;
}

/** `legal`, `legalityDetail` and `formatErrors` of a decks API deck; `null` when it has no `legal`. */
export function legalityFromApi(deck: Pick<Deck, 'legal' | 'formatErrors' | 'legalityDetail'>): DeckLegality | null {
  if (typeof deck.legal !== 'boolean') return null;
  if (deck.legal) return { state: 'legal', rules: [], errors: [] };
  const errors = Array.isArray(deck.formatErrors) ? deck.formatErrors.map(String) : [];
  const detail = deck.legalityDetail;
  const rules = detail && !Array.isArray(detail) ? Object.keys(detail).filter((k) => k !== 'global' && detail[k] === false) : [];
  return { state: rules.length || errors.length ? 'illegal' : 'unknown', rules, errors };
}

/** Client-side legality (guest decks, or a deck changed since the API computed it). */
export function legalityFromStatus(status: DeckStatus, hasHero: boolean): DeckLegality {
  const rules: string[] = [...(hasHero ? [] : ['hero']), ...status.rules];
  return { state: rules.length ? 'illegal' : 'legal', rules, errors: [] };
}
