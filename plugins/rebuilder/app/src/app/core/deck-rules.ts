import type { Card } from './models';
import { rarityFromReference } from './models';

/**
 * Card helpers shared by the deck views (rarity, type, rarity counts). A deck's legality is the decks API's
 * (`deck-legality.ts`); the formats' rules are read from it too (`format-rules.ts`).
 */

export interface RarityCounts {
  C: number;
  R: number;
  U: number;
  E: number;
}

export function rarityOf(card: Card): 'COMMON' | 'RARE' | 'UNIQUE' | 'EXALTED' {
  const r = (card.rarity?.reference || rarityFromReference(card.reference)).toUpperCase();
  return r === 'RARE' || r === 'UNIQUE' || r === 'EXALTED' ? r : 'COMMON';
}

export function typeOf(card: Card): string {
  return (card.cardType?.reference || '').toUpperCase();
}

/** Copies by rarity of deck lines, the hero left out. */
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
