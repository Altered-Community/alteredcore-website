import type { DeckStatus, LegalityRule, RuleCheck } from './deck-rules';
import type { Deck } from './models';

/**
 * Legality shown on the deck page and in the editor. `unknown`: the decks API says `legal: false` without
 * any failed check (a freshly imported draft, legality not computed yet): no badge, as on the site.
 */
export interface DeckLegality {
  state: 'legal' | 'illegal' | 'unknown';
  /** Failed rules (`legalityDetail` keys, or the editor's own checks for a guest deck). */
  rules: string[];
  /** `formatErrors` of the decks API, as is. */
  errors: string[];
  /** Every rule of the format, passed or failed, when the editor computed them (the site's rules modal). */
  checks?: RuleCheck[];
}

const RULE_LABELS: Record<LegalityRule, string> = {
  hero: $localize`:@@core.legality.hero:Héros manquant ou invalide`,
  deckSize: $localize`:@@core.legality.deckSize:Nombre de cartes invalide`,
  faction: $localize`:@@core.legality.faction:Cartes de plusieurs factions`,
  sets: $localize`:@@core.legality.sets:Cartes de sets non autorisés`,
  bannedCards: $localize`:@@core.legality.bannedCards:Contient des cartes bannies`,
  suspendedCards: $localize`:@@core.legality.suspendedCards:Contient des cartes suspendues`,
  copies: $localize`:@@core.legality.copies:Trop de copies d’un même nom`,
  uniqueCopies: $localize`:@@core.legality.uniqueCopies:Trop de copies d’une même carte unique`,
  nameRarityCopies: $localize`:@@core.legality.nameRarityCopies:Plus d’un exemplaire d’un même nom et d’une même rareté`,
  uniqueQuantity: $localize`:@@core.legality.uniqueQuantity:Trop de cartes uniques`,
  rareQuantity: $localize`:@@core.legality.rareQuantity:Trop de cartes rares`,
  exaltedQuantity: $localize`:@@core.legality.exaltedQuantity:Trop de cartes exaltées`,
  frontierUniques: $localize`:@@core.legality.frontierUniques:Cartes uniques hors de la liste Frontier`,
};

/** A rule as a requirement, for the list of passed and failed rules. */
const CHECK_LABELS: Record<LegalityRule, string> = {
  hero: $localize`:@@core.check.hero:Un héros`,
  deckSize: $localize`:@@core.check.deckSize:Nombre de cartes`,
  faction: $localize`:@@core.check.faction:Toutes les cartes de la faction du héros`,
  sets: $localize`:@@core.check.sets:Sets autorisés`,
  bannedCards: $localize`:@@core.check.bannedCards:Aucune carte bannie`,
  suspendedCards: $localize`:@@core.check.suspendedCards:Aucune carte suspendue`,
  copies: $localize`:@@core.check.copies:Exemplaires d’un même nom`,
  uniqueCopies: $localize`:@@core.check.uniqueCopies:Exemplaires d’une même carte unique`,
  nameRarityCopies: $localize`:@@core.check.nameRarityCopies:Exemplaires d’un même nom et d’une même rareté`,
  uniqueQuantity: $localize`:@@core.check.uniqueQuantity:Cartes uniques`,
  rareQuantity: $localize`:@@core.check.rareQuantity:Cartes rares`,
  exaltedQuantity: $localize`:@@core.check.exaltedQuantity:Cartes exaltées`,
  frontierUniques: $localize`:@@core.check.frontierUniques:Uniques de la liste Frontier`,
};

/** Rules the editor splits out of the decks API's `copies`. */
const API_RULE: Partial<Record<LegalityRule, LegalityRule>> = { uniqueCopies: 'copies', nameRarityCopies: 'copies' };

/** Label of a failed rule; an unknown key is shown as is. */
export function legalityRuleLabel(rule: string): string {
  return RULE_LABELS[rule as LegalityRule] ?? rule;
}

/** What is wrong with one deck line (`DeckStatus.violations`). */
const LINE_LABELS: Partial<Record<LegalityRule, string>> = {
  faction: $localize`:@@core.violation.faction:Hors de la faction du héros`,
  bannedCards: $localize`:@@core.violation.bannedCards:Carte bannie`,
  suspendedCards: $localize`:@@core.violation.suspendedCards:Carte suspendue`,
  uniqueQuantity: $localize`:@@core.violation.uniqueQuantity:Cartes uniques interdites dans ce format`,
};

/** Label of a rule a deck line breaks. */
export function lineViolationLabel(rule: LegalityRule): string {
  return LINE_LABELS[rule] ?? legalityRuleLabel(rule);
}

/** Label of a rule in the passed / failed list; an unknown key is shown as is. */
export function legalityCheckLabel(rule: string): string {
  return CHECK_LABELS[rule as LegalityRule] ?? rule;
}

/** `39 / 39–59`, `2 / 3`, `≤ 3`, or `''` for a yes / no rule. */
export function legalityCheckDetail(check: RuleCheck): string {
  if (check.current !== null && check.min !== null && check.max !== null) return `${check.current} / ${check.min}–${check.max}`;
  if (check.current !== null && check.max !== null) return `${check.current} / ${check.max}`;
  if (check.max !== null) return `≤ ${check.max}`;
  return check.current !== null ? String(check.current) : '';
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
  const checks: RuleCheck[] = [{ rule: 'hero', ok: hasHero, current: null, min: null, max: null }, ...status.checks];
  return { state: rules.length ? 'illegal' : 'legal', rules, errors: [], checks };
}

/**
 * The editor's checks with the decks API's verdict on top: a rule the server failed is failed even when the
 * editor cannot see why (banned status of a card loaded from the decks API, sets, Frontier list).
 * `server` may be the editor's own legality (no server verdict for this content): then it changes nothing.
 */
export function withServerVerdict(local: DeckLegality, server: DeckLegality): DeckLegality {
  const localChecks = local.checks ?? [];
  // Server rules the editor already explains (its `copies` covers `uniqueCopies` and `nameRarityCopies`).
  const explained = new Set<string>(localChecks.flatMap((c) => (c.ok ? [] : [c.rule, API_RULE[c.rule] ?? c.rule])));
  const failed = new Set(server.rules.filter((r) => !explained.has(r)));
  const checks = localChecks.map((c) => (c.ok && failed.has(c.rule) ? { ...c, ok: false } : c));
  const known = new Set<string>(checks.map((c) => c.rule));
  for (const r of failed) if (!known.has(r)) checks.push({ rule: r as LegalityRule, ok: false, current: null, min: null, max: null });
  const rules = local.checks ? checks.filter((c) => !c.ok).map((c) => c.rule as string) : [...new Set([...local.rules, ...server.rules])];
  const errors = server.errors;
  const state = rules.length || errors.length ? 'illegal' : 'legal';
  return local.checks ? { state, rules, errors, checks } : { state, rules, errors };
}
