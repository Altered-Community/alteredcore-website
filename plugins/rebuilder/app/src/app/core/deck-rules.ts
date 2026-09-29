import { formatInfo } from './formats';
import type { Card, DeckFormat, HydratedLine } from './models';
import { localizedText, rarityFromReference } from './models';

/**
 * Deck legality, mirroring `GET https://decks.alteredcore.org/api/formats`
 * (limits: unique, rare, exalted, maxCopiesPerName, maxCopiesPerRarity).
 * The server stays the authority for saved decks; this drives the editor badges.
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
}

/** Keys of the decks API `legalityDetail` (`false` = rule failed). */
export type LegalityRule =
  | 'hero'
  | 'deckSize'
  | 'faction'
  | 'sets'
  | 'bannedCards'
  | 'suspendedCards'
  | 'copies'
  | 'uniqueQuantity'
  | 'rareQuantity'
  | 'exaltedQuantity';

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

export function computeDeckStatus(lines: HydratedLine[], format: DeckFormat = 'standard'): DeckStatus {
  const limits = formatInfo(format);
  const sandbox = format === 'sandbox';
  let total = 0;
  let characters = 0;
  let common = 0;
  let rare = 0;
  let unique = 0;
  let exalted = 0;
  const issues: string[] = [];
  const rules = new Set<LegalityRule>();
  const byName = new Map<string, number>();
  const byNameRarity = new Map<string, number>();

  for (const line of lines) {
    if (typeOf(line.card) === 'HERO') continue;
    const qty = line.quantity;
    total += qty;
    if (typeOf(line.card) === 'CHARACTER') characters += qty;
    const r = rarityOf(line.card);
    if (r === 'COMMON') common += qty;
    if (r === 'RARE') rare += qty;
    if (r === 'UNIQUE') unique += qty;
    if (r === 'EXALTED') exalted += qty;
    if (r === 'UNIQUE' && qty > 1) {
      issues.push(`${line.card.reference}: ${qty}/1`);
      rules.add('copies');
    }
    const key = nameKey(line.card);
    byName.set(key, (byName.get(key) ?? 0) + qty);
    byNameRarity.set(`${key}|${r}`, (byNameRarity.get(`${key}|${r}`) ?? 0) + qty);
  }

  if (!sandbox) {
    for (const [name, qty] of byName) {
      if (qty > COPY_MAX) {
        issues.push(`copies ${name}: ${qty}/${COPY_MAX}`);
        rules.add('copies');
      }
    }
    if (limits.copyMax === 1) {
      for (const [key, qty] of byNameRarity) {
        if (qty > 1) {
          issues.push(`singleton ${key}: ${qty}/1`);
          rules.add('copies');
        }
      }
    }
  }

  if (total < limits.min || total > limits.max) {
    issues.push(`size ${total}/${limits.min}-${limits.max}`);
    rules.add('deckSize');
  }
  if (!sandbox && limits.copyMax > 1 && rare > RARE_MAX) {
    issues.push(`rare ${rare}/${RARE_MAX}`);
    rules.add('rareQuantity');
  }
  if (!sandbox && unique > limits.uniqueMax) {
    issues.push(`unique ${unique}/${limits.uniqueMax}`);
    rules.add('uniqueQuantity');
  }
  if (!sandbox && limits.copyMax > 1 && exalted > EXALTED_MAX) {
    issues.push(`exalted ${exalted}/${EXALTED_MAX}`);
    rules.add('exaltedQuantity');
  }

  return { total, characters, common, rare, unique, exalted, legal: issues.length === 0, issues, rules: [...rules] };
}

/** Max copies of one reference the editor lets the user add. */
export function maxCopiesFor(card: Card, format: DeckFormat = 'standard'): number {
  if (typeOf(card) === 'HERO') return 1;
  if (rarityOf(card) === 'UNIQUE') return 1;
  if (format === 'sandbox') return 99;
  return formatInfo(format).copyMax === 1 ? 1 : COPY_MAX;
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
