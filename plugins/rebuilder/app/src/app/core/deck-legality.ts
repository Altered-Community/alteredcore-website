import { printKey } from './deck-prints';
import type { Deck, DeckIssue } from './models';

/**
 * A deck's legality, from the decks API only: it validates every save (not a deck saved as a draft) and answers with
 * `legal`, `errors` (`{code, reference, message}`, translated with `?locale=`), `formatErrors` (their messages) and
 * `legalityDetail` (rule → passed). The editor has no rule engine of its own: a guest deck, a deck not saved yet, or a
 * draft, is `unknown` (no badge).
 */
export interface DeckLegality {
  state: 'legal' | 'illegal' | 'unknown';
  /** Failed rules (`legalityDetail` keys). */
  rules: string[];
  /** Messages of the problems (`errors`, else `formatErrors`). */
  errors: string[];
  /** The problems with their code and card (`errors`); empty with the former decks API. */
  issues: DeckIssue[];
  /** Every rule of `legalityDetail`, passed or failed, in the API's order. */
  checks: { rule: string; ok: boolean }[];
}

export const UNKNOWN_LEGALITY: DeckLegality = { state: 'unknown', rules: [], errors: [], issues: [], checks: [] };

const RULE_LABELS: Record<string, string> = {
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
  frontierUniques: $localize`:@@core.legality.frontierUniques:Cartes uniques hors de la liste Frontier`,
  cards: $localize`:@@core.legality.cards:Cartes inconnues`,
  pool: $localize`:@@core.legality.pool:Cartes hors de votre pool scellé`,
};

/** A rule as a requirement, for the list of passed and failed rules. */
const CHECK_LABELS: Record<string, string> = {
  hero: $localize`:@@core.check.hero:Un héros`,
  deckSize: $localize`:@@core.check.deckSize:Nombre de cartes`,
  faction: $localize`:@@core.check.faction:Toutes les cartes de la faction du héros`,
  sets: $localize`:@@core.check.sets:Sets autorisés`,
  bannedCards: $localize`:@@core.check.bannedCards:Aucune carte bannie`,
  suspendedCards: $localize`:@@core.check.suspendedCards:Aucune carte suspendue`,
  copies: $localize`:@@core.check.copies:Exemplaires d’un même nom`,
  uniqueQuantity: $localize`:@@core.check.uniqueQuantity:Cartes uniques`,
  rareQuantity: $localize`:@@core.check.rareQuantity:Cartes rares`,
  exaltedQuantity: $localize`:@@core.check.exaltedQuantity:Cartes exaltées`,
  frontierUniques: $localize`:@@core.check.frontierUniques:Uniques de la liste Frontier`,
  cards: $localize`:@@core.check.cards:Cartes existantes`,
  pool: $localize`:@@core.check.pool:Cartes de votre pool scellé`,
};

/** « Non légal », with the number of problems when there are some to show (« Non légal · 2 problèmes »). */
export function illegalLabel(problems: number): string {
  if (!problems) return $localize`:@@deck.page.illegal:Non légal`;
  return problems === 1
    ? $localize`:@@deck.bar.illegalOne:Non légal · ${problems}:count: problème`
    : $localize`:@@deck.bar.illegalMany:Non légal · ${problems}:count: problèmes`;
}

/** Problems to count on the « Non légal » badge: the API's messages, else its failed rules. */
export function problemCount(legality: DeckLegality): number {
  return legality.errors.length || legality.rules.length;
}

/** Label of a failed rule; an unknown key is shown as is. */
export function legalityRuleLabel(rule: string): string {
  return RULE_LABELS[rule] ?? rule;
}

/** Label of a rule in the passed / failed list; an unknown key is shown as is. */
export function legalityCheckLabel(rule: string): string {
  return CHECK_LABELS[rule] ?? rule;
}

/**
 * `legal`, `errors` (else `formatErrors`) and `legalityDetail` of a decks API deck; `null` when it has no `legal`.
 * `unknown`: `legal: false` without any problem (a draft, or a deck the API has not validated).
 */
export function legalityFromApi(deck: Pick<Deck, 'legal' | 'formatErrors' | 'legalityDetail' | 'errors'>): DeckLegality | null {
  if (typeof deck.legal !== 'boolean') return null;
  const detail = deck.legalityDetail;
  const checks = detail && !Array.isArray(detail) ? Object.entries(detail).filter(([k]) => k !== 'global').map(([rule, ok]) => ({ rule, ok: ok !== false })) : [];
  if (deck.legal) return { state: 'legal', rules: [], errors: [], issues: [], checks };
  const issues = Array.isArray(deck.errors) ? deck.errors.filter((e) => !!e && typeof e.message === 'string') : [];
  const errors = issues.length ? issues.map((e) => e.message) : Array.isArray(deck.formatErrors) ? deck.formatErrors.map(String) : [];
  const rules = checks.filter((c) => !c.ok).map((c) => c.rule);
  return { state: rules.length || errors.length ? 'illegal' : 'unknown', rules, errors, issues, checks };
}

/**
 * The problems of each deck line, by the line's reference: an `errors` entry about a card is shown on every print of
 * that card (same family and rarity as its canonical reference, `printKey`).
 */
export function lineIssuesOf(legality: DeckLegality, references: readonly string[]): ReadonlyMap<string, string[]> {
  const byKey = new Map<string, string[]>();
  for (const issue of legality.issues) {
    if (!issue.reference) continue;
    const key = printKey(issue.reference);
    byKey.set(key, [...(byKey.get(key) ?? []), issue.message]);
  }
  const out = new Map<string, string[]>();
  if (!byKey.size) return out;
  for (const ref of references) {
    const messages = byKey.get(printKey(ref));
    if (messages) out.set(ref, messages);
  }
  return out;
}
