import { familyOf, printParts } from './deck-prints';
import type { Card } from './models';
import { rarityFromReference } from './models';

/**
 * A format's rules as the decks API describes them (`GET /api/formats`). The decks API validates every saved deck and is
 * the only judge of legality (`deck-legality.ts`); the editor only reads these to cap the copies it lets the player add,
 * to leave out of the search the cards the format refuses and to show the rarity caps.
 */
export interface FormatRules {
  code: string;
  label: string;
  hidden?: boolean;
  minCards: number | null;
  maxCards: number | null;
  allowBanned: boolean;
  allowSuspended: boolean;
  limits: {
    /** Uniques in the deck (0: none), `null` = no limit or by hero (`uniqueLimitsByHero`). */
    unique: number | null;
    rare: number | null;
    exalted: number | null;
    /** Copies of one card family (`AX_04`), across rarities, sets and prints. */
    maxCopiesPerName: number | null;
    /** Copies of one family at one rarity (Singleton: 1). */
    maxCopiesPerRarity: number | null;
  };
  /** Uniques by hero: limit → hero first names (lower case). */
  uniqueLimitsByHero?: Record<string, string[]> | null;
  maxFactions?: number | null;
  sets?: { allowed: string[]; forbidden: string[] } | null;
  /** Entries: full references, families (`BR_06`) or family + rarity (`OR_27_R1`); empty when the format allows them. */
  bannedCards?: string[] | null;
  suspendedCards?: string[] | null;
  /** Frontier: the only Uniques allowed (references); `null` = any. */
  uniqueAllowlist?: string[] | null;
}

/** Copies of one card when the format sets no limit (or its rules are not known yet). */
export const NO_COPY_LIMIT = 99;

type Rarity = 'COMMON' | 'RARE' | 'UNIQUE' | 'EXALTED';

function rarityOfCard(card: Card): Rarity {
  const r = (card.rarity?.reference || rarityFromReference(card.reference)).toUpperCase();
  return r === 'RARE' || r === 'UNIQUE' || r === 'EXALTED' ? r : 'COMMON';
}

/** Uniques allowed with this hero (Singleton: 3 to 5 by hero, the lowest when the hero is not listed); `null` = no limit. */
export function uniqueLimit(rules: FormatRules | null | undefined, heroName?: string | null): number | null {
  if (!rules) return null;
  const byHero = rules.uniqueLimitsByHero;
  if (!byHero || !Object.keys(byHero).length) return rules.limits.unique;
  const first = (heroName ?? '').trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  const found = Object.entries(byHero).find(([, names]) => names.some((n) => n.toLowerCase() === first));
  if (found) return Number(found[0]);
  return Math.min(...Object.keys(byHero).map(Number).filter((n) => !Number.isNaN(n)));
}

/** The format refuses every Unique. */
export function uniquesForbidden(rules: FormatRules | null | undefined): boolean {
  return !!rules && rules.limits.unique === 0 && !rules.uniqueLimitsByHero;
}

/**
 * Copies of one card (family + rarity) the editor lets the player have, the other cards of its family aside: 0 for a
 * Unique where the format has none, 1 for a Unique, else the family and rarity caps. No rules (not loaded): no cap.
 */
export function maxCopiesFor(card: Card, rules: FormatRules | null | undefined): number {
  if ((card.cardType?.reference || '').toUpperCase() === 'HERO') return 1;
  if (!rules) return NO_COPY_LIMIT;
  const perName = rules.limits.maxCopiesPerName;
  if (rarityOfCard(card) === 'UNIQUE') {
    if (uniquesForbidden(rules)) return 0;
    return perName === null ? NO_COPY_LIMIT : 1;
  }
  return Math.min(perName ?? NO_COPY_LIMIT, rules.limits.maxCopiesPerRarity ?? NO_COPY_LIMIT);
}

/** A ban-list entry (`ALT_…` reference, family `BR_06`, family + rarity `OR_27_R1`) covers this print. */
export function listed(entries: readonly string[] | null | undefined, reference: string): boolean {
  if (!entries?.length) return false;
  const family = familyOf(reference);
  const rarity = printParts(reference)?.rarity;
  return entries.some((e) => e === reference || (!!family && (e === family || (!!rarity && e === `${family}_${rarity}`))));
}

/**
 * Whether the format lets `card` in at all, whatever the deck: its set (allowed, not forbidden), no Unique in a No
 * Unique format, in Frontier only the Uniques of its list, no banned or suspended card where they are refused. A hint
 * for the search: the decks API decides (a reprint of a card may be legal where this print's set is not).
 */
export function allowedInFormat(card: Card, rules: FormatRules | null | undefined): boolean {
  if (!rules) return true;
  const set = printParts(card.reference)?.set ?? card.reference.split('_')[1] ?? '';
  if (rules.sets?.forbidden?.includes(set)) return false;
  if (rules.sets?.allowed?.length && !rules.sets.allowed.includes(set)) return false;
  if (maxCopiesFor(card, rules) === 0) return false;
  if (rules.uniqueAllowlist && rarityOfCard(card) === 'UNIQUE' && !rules.uniqueAllowlist.includes(card.reference)) return false;
  if (!rules.allowBanned && (card.isBanned || listed(rules.bannedCards, card.reference))) return false;
  return !(!rules.allowSuspended && (card.isSuspended || listed(rules.suspendedCards, card.reference)));
}

/** Why a card cannot be added at all in this format (a Unique where the format has none), else `null`. */
export function addBlockedReason(card: Card, rules: FormatRules | null | undefined, formatLabel: string): string | null {
  if (maxCopiesFor(card, rules) > 0) return null;
  return $localize`:@@core.rules.noUniques:Cartes uniques interdites en ${formatLabel}:format:`;
}

/** A rarity the format caps: its copies in the deck and the cap. */
export interface RarityLimit {
  key: 'R' | 'E' | 'U';
  count: number;
  limit: number;
}

/** Rares, Exalteds and Uniques against the format's caps (the hero's for Uniques); a rarity without a cap is left out. */
export function rarityLimits(
  counts: { R: number; E: number; U: number },
  rules: FormatRules | null | undefined,
  heroName?: string | null,
): RarityLimit[] {
  if (!rules) return [];
  const all: { key: RarityLimit['key']; count: number; limit: number | null }[] = [
    { key: 'R', count: counts.R, limit: rules.limits.rare },
    { key: 'E', count: counts.E, limit: rules.limits.exalted },
    { key: 'U', count: counts.U, limit: uniqueLimit(rules, heroName) },
  ];
  return all.filter((r): r is RarityLimit => r.limit !== null);
}
