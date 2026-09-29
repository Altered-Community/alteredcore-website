import { formatInfo, type FormatInfo } from './formats';
import type { Card, DeckFormat, DeckHero, HydratedLine } from './models';
import { localizedText, rarityFromReference } from './models';

/**
 * Deck legality: the rules of the site's deck builder (`plugins/core-altered-cards/assets/deckbuilder/validation.js`)
 * with the limits of `formats.ts`. The server stays the authority for saved decks; this drives the editor badges.
 */
export const DECK_SIZE = 39;
export const RARE_MAX = 15;
export const UNIQUE_MAX = 3;
export const EXALTED_MAX = 3;
export const COPY_MAX = 3;

export interface RarityCounts {
  C: number;
  R: number;
  U: number;
  E: number;
}

/** One rule of the format, passed or failed (the site's « Règles du format » list). */
export interface RuleCheck {
  rule: LegalityRule;
  ok: boolean;
  /** Count checked (cards, Uniques…); `null` for a yes / no rule. */
  current: number | null;
  min: number | null;
  max: number | null;
}

export interface DeckStatus {
  total: number;
  characters: number;
  common: number;
  rare: number;
  unique: number;
  exalted: number;
  legal: boolean;
  issues: string[];
  /** Failed rules, keyed like the decks API `legalityDetail` (see `deck-legality.ts`). */
  rules: LegalityRule[];
  /** Every rule of the format but the hero's, in the site's order. */
  checks: RuleCheck[];
  /** Rules a deck line breaks, by card reference (off-faction, too many copies, banned…). */
  violations: Readonly<Record<string, readonly LegalityRule[]>>;
  /** Uniques allowed with this hero in this format; `null` = no limit. */
  uniqueMax: number | null;
}

/**
 * Keys of the decks API `legalityDetail` (`false` = rule failed), plus `uniqueCopies` and
 * `nameRarityCopies`, which the API counts in `copies`.
 */
export type LegalityRule =
  | 'hero'
  | 'deckSize'
  | 'faction'
  | 'sets'
  | 'bannedCards'
  | 'suspendedCards'
  | 'copies'
  | 'uniqueCopies'
  | 'nameRarityCopies'
  | 'uniqueQuantity'
  | 'rareQuantity'
  | 'exaltedQuantity'
  | 'frontierUniques';

export type HeroLike = Pick<DeckHero, 'reference'> & Partial<Pick<DeckHero, 'faction'>>;

export function rarityOf(card: Card): 'COMMON' | 'RARE' | 'UNIQUE' | 'EXALTED' {
  const r = (card.rarity?.reference || rarityFromReference(card.reference)).toUpperCase();
  return r === 'RARE' || r === 'UNIQUE' || r === 'EXALTED' ? r : 'COMMON';
}

export function typeOf(card: Card): string {
  return (card.cardType?.reference || '').toUpperCase();
}

function nameKey(card: Card): string {
  return (localizedText(card.name, 'en') || card.reference).toLowerCase();
}

/** `FACTION_NUMBER` of a hero reference (`ALT_CORE_B_AX_01_C` → `AX_01`), as the site's `heroStableKey`. */
export function heroKey(reference: string): string {
  const p = reference.split('_');
  return `${p[3] ?? ''}_${p[4] ?? ''}`;
}

function heroFaction(hero: HeroLike): string | null {
  return hero.faction || /^ALT_[^_]+_[^_]+_([A-Z]{2})_/.exec(hero.reference)?.[1] || null;
}

/**
 * Faction of a deck card from its data, never from its reference: an out-of-faction rare (`_R2`) or
 * a transfuge Unique keeps the reference of the card it comes from. Unknown: not checked, as on the site.
 */
function cardFaction(card: Card): string | null {
  return card.faction?.code || null;
}

/** Uniques allowed with this hero (Singleton: 3 to 5 by hero); `null` = no limit. */
export function uniqueLimit(limits: FormatInfo, hero?: HeroLike | null): number | null {
  const byHero = hero ? limits.heroUniqueLimits?.[heroKey(hero.reference)] : undefined;
  return byHero ?? limits.uniqueMax;
}

export function computeDeckStatus(lines: HydratedLine[], format: DeckFormat = 'standard', hero?: HeroLike | null): DeckStatus {
  const limits = formatInfo(format);
  const uniqueMax = uniqueLimit(limits, hero);
  let total = 0;
  let characters = 0;
  let common = 0;
  let rare = 0;
  let unique = 0;
  let exalted = 0;
  const issues: string[] = [];
  const checks: RuleCheck[] = [];
  const violations: Record<string, LegalityRule[]> = {};
  const byName = new Map<string, number>();
  const byNameRarity = new Map<string, number>();
  const factions = new Set<string>();
  const deckLines = lines.filter((l) => typeOf(l.card) !== 'HERO' && l.quantity > 0);

  const flag = (reference: string, rule: LegalityRule) => {
    const list = (violations[reference] ??= []);
    if (!list.includes(rule)) list.push(rule);
  };
  const check = (rule: LegalityRule, ok: boolean, current: number | null = null, max: number | null = null, min: number | null = null) =>
    checks.push({ rule, ok, current, min, max });

  for (const line of deckLines) {
    const qty = line.quantity;
    total += qty;
    if (typeOf(line.card) === 'CHARACTER') characters += qty;
    const r = rarityOf(line.card);
    if (r === 'COMMON') common += qty;
    if (r === 'RARE') rare += qty;
    if (r === 'UNIQUE') unique += qty;
    if (r === 'EXALTED') exalted += qty;
    const key = nameKey(line.card);
    byName.set(key, (byName.get(key) ?? 0) + qty);
    byNameRarity.set(`${key}|${r}`, (byNameRarity.get(`${key}|${r}`) ?? 0) + qty);
    const f = cardFaction(line.card);
    if (f) factions.add(f);
  }

  const sizeOk = total >= limits.min && total <= limits.max;
  check('deckSize', sizeOk, total, limits.max, limits.min);
  if (!sizeOk) issues.push(`size ${total}/${limits.min}-${limits.max}`);

  if (limits.rareMax !== null) {
    check('rareQuantity', rare <= limits.rareMax, rare, limits.rareMax);
    if (rare > limits.rareMax) issues.push(`rare ${rare}/${limits.rareMax}`);
  }
  if (limits.exaltedMax !== null) {
    check('exaltedQuantity', exalted <= limits.exaltedMax, exalted, limits.exaltedMax);
    if (exalted > limits.exaltedMax) issues.push(`exalted ${exalted}/${limits.exaltedMax}`);
  }
  if (uniqueMax !== null) {
    check('uniqueQuantity', unique <= uniqueMax, unique, uniqueMax);
    if (unique > uniqueMax) issues.push(`unique ${unique}/${uniqueMax}`);
    // No Unique formats: each Unique is the problem, so each one is flagged.
    if (uniqueMax === 0) for (const l of deckLines) if (rarityOf(l.card) === 'UNIQUE') flag(l.card.reference, 'uniqueQuantity');
  }

  if (limits.uniqueCopyMax !== null) {
    const max = limits.uniqueCopyMax;
    const over = deckLines.filter((l) => rarityOf(l.card) === 'UNIQUE' && l.quantity > max);
    check('uniqueCopies', !over.length, null, max);
    for (const l of over) {
      issues.push(`${l.card.reference}: ${l.quantity}/${max}`);
      flag(l.card.reference, 'uniqueCopies');
    }
  }
  if (limits.nameCopyMax !== null) {
    const max = limits.nameCopyMax;
    const over = new Set([...byName].filter(([, qty]) => qty > max).map(([name]) => name));
    check('copies', !over.size, null, max);
    for (const name of over) issues.push(`copies ${name}: ${byName.get(name)}/${max}`);
    for (const l of deckLines) if (over.has(nameKey(l.card))) flag(l.card.reference, 'copies');
  }
  if (limits.nameRarityCopyMax !== null) {
    const max = limits.nameRarityCopyMax;
    const over = new Set([...byNameRarity].filter(([, qty]) => qty > max).map(([key]) => key));
    check('nameRarityCopies', !over.size, null, max);
    for (const key of over) issues.push(`singleton ${key}: ${byNameRarity.get(key)}/${max}`);
    for (const l of deckLines) if (over.has(`${nameKey(l.card)}|${rarityOf(l.card)}`)) flag(l.card.reference, 'nameRarityCopies');
  }

  if (limits.sameFaction) {
    const own = hero ? heroFaction(hero) : null;
    if (own) factions.add(own);
    check('faction', factions.size <= 1);
    if (factions.size > 1) {
      issues.push(`faction ${[...factions].join(',')}`);
      if (own) for (const l of deckLines) if ((cardFaction(l.card) ?? own) !== own) flag(l.card.reference, 'faction');
    }
  }
  if (!limits.allowBanned) {
    const banned = deckLines.filter((l) => l.card.isBanned);
    check('bannedCards', !banned.length, banned.length || null);
    for (const l of banned) {
      issues.push(`banned ${l.card.reference}`);
      flag(l.card.reference, 'bannedCards');
    }
  }
  if (!limits.allowSuspended) {
    const suspended = deckLines.filter((l) => l.card.isSuspended);
    check('suspendedCards', !suspended.length, suspended.length || null);
    for (const l of suspended) {
      issues.push(`suspended ${l.card.reference}`);
      flag(l.card.reference, 'suspendedCards');
    }
  }

  const rules = checks.filter((c) => !c.ok).map((c) => c.rule);
  return { total, characters, common, rare, unique, exalted, legal: rules.length === 0, issues, rules, checks, violations, uniqueMax };
}

/** Max copies of one reference the editor lets the user add: 0 for a Unique in a No Unique format. */
export function maxCopiesFor(card: Card, format: DeckFormat = 'standard'): number {
  if (typeOf(card) === 'HERO') return 1;
  const limits = formatInfo(format);
  if (rarityOf(card) === 'UNIQUE') {
    if (limits.uniqueMax === 0) return 0;
    return Math.min(limits.copyMax, limits.uniqueCopyMax ?? limits.copyMax);
  }
  return limits.copyMax;
}

/** Why a card cannot be added at all in this format (`maxCopiesFor` is 0), else `null`. */
export function addBlockedReason(card: Card, format: DeckFormat = 'standard'): string | null {
  if (maxCopiesFor(card, format) > 0) return null;
  return $localize`:@@core.rules.noUniques:Cartes uniques interdites en ${formatInfo(format).label}:format:`;
}

export function maxCopiesForRarity(rarity: string): number {
  return rarity.toUpperCase() === 'UNIQUE' ? 1 : COPY_MAX;
}

export function rarityCountsFromRefs(
  lines: { cardReference: string; quantity: number; cardTypeReference?: string | null }[],
  heroReference?: string | null,
): RarityCounts {
  const out: RarityCounts = { C: 0, R: 0, U: 0, E: 0 };
  for (const l of lines) {
    if (l.cardTypeReference === 'HERO' || l.cardReference === heroReference) continue;
    const r = rarityFromReference(l.cardReference);
    if (r === 'RARE') out.R += l.quantity;
    else if (r === 'UNIQUE') out.U += l.quantity;
    else if (r === 'EXALTED') out.E += l.quantity;
    else out.C += l.quantity;
  }
  return out;
}
