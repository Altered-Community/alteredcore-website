import { typeOf } from './deck-rules';
import type { Card, HydratedLine } from './models';

/** Opening hand size in Altered (the site's `HAND_SIZE`). */
export const HAND_SIZE = 6;

/** One physical copy of a card; `id` tells two copies of the same card apart. */
export interface DrawnCard {
  id: number;
  card: Card;
}

/** Every non-hero copy of the deck, in deck order. */
export function handPool(lines: HydratedLine[]): DrawnCard[] {
  const pool: DrawnCard[] = [];
  for (const { card, quantity } of lines) {
    if (typeOf(card) === 'HERO') continue;
    for (let i = 0; i < quantity; i++) pool.push({ id: pool.length, card });
  }
  return pool;
}

/** Fisher–Yates shuffle into a new array; `random` returns [0, 1) (tests pass their own). */
export function shuffled<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface HandSummary {
  characters: number;
  spells: number;
  permanents: number;
  /** Average main cost, one decimal; `null` for an empty hand. */
  averageCost: number | null;
}

export function handSummary(hand: DrawnCard[]): HandSummary {
  let characters = 0;
  let spells = 0;
  let permanents = 0;
  let cost = 0;
  for (const { card } of hand) {
    const t = typeOf(card);
    if (t === 'CHARACTER') characters++;
    else if (t === 'SPELL') spells++;
    else if (t.includes('PERMANENT')) permanents++;
    cost += card.mainCost ?? 0;
  }
  return { characters, spells, permanents, averageCost: hand.length ? Math.round((cost / hand.length) * 10) / 10 : null };
}
