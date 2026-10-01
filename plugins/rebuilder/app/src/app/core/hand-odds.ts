import { isUniqueReference } from './card-art';
import { rarityOf, typeOf } from './deck-rules';
import type { HydratedLine } from './models';
import { localizedText } from './models';
import { contentLocale } from './locale';

/**
 * Opening-hand odds, exact (hypergeometric), ported from the site's
 * `core-altered-cards/assets/hand-odds-math.js` so both pages give the same numbers.
 */

export function binom(n: number, k: number): bigint {
  const N = BigInt(n);
  let K = BigInt(k);
  if (K < 0n || K > N) return 0n;
  if (K > N - K) K = N - K;
  let r = 1n;
  for (let i = 0n; i < K; i++) r = (r * (N - i)) / (i + 1n);
  return r;
}

function ratio(num: bigint, den: bigint): number {
  return den === 0n ? 0 : Number(num) / Number(den);
}

/** P(at least one of the K copies among n cards drawn from N). */
export function pAtLeastOne(N: number, K: number, n: number): number {
  if (K <= 0) return 0;
  if (n >= N) return 1;
  return 1 - ratio(binom(N - K, n), binom(N, n));
}

/** P(at least t of the K copies among n cards drawn from N). */
export function pAtLeast(N: number, K: number, n: number, t: number): number {
  if (t <= 0) return 1;
  const jmax = Math.min(K, n);
  if (K <= 0 || t > jmax) return 0;
  if (n >= N) return K >= t ? 1 : 0;
  const d = binom(N, n);
  let p = 0;
  for (let j = t; j <= jmax; j++) p += ratio(binom(K, j) * binom(N - K, n - j), d);
  return Math.min(1, Math.max(0, p));
}

/** P(at least one of A and at least one of B), A and B disjoint (inclusion–exclusion). */
export function pComboBoth(N: number, a: number, b: number, n: number): number {
  const d = binom(N, n);
  return Math.max(0, 1 - ratio(binom(N - a, n), d) - ratio(binom(N - b, n), d) + ratio(binom(N - a - b, n), d));
}

function canPlayTwo(n0: number, n1: number, n2: number, n3: number): boolean {
  return n0 >= 2 || (n0 >= 1 && n1 + n2 + n3 >= 1) || n1 >= 2 || (n1 >= 1 && n2 >= 1);
}

/** Most cards playable with the 3 mana of day 1, given counts of 0/1/2/3-cost cards. */
function maxPlayable(n0: number, n1: number, n2: number, n3: number): number {
  let cnt = n0;
  let b = 3;
  const t1 = Math.min(n1, b);
  cnt += t1;
  b -= t1;
  const t2 = Math.min(n2, Math.floor(b / 2));
  cnt += t2;
  b -= 2 * t2;
  cnt += Math.min(n3, Math.floor(b / 3));
  return cnt;
}

/** Most of the 3 day-1 mana that can be spent, given counts of 1/2/3-cost cards. */
function maxManaSpend(n1: number, n2: number, n3: number): number {
  if (n3 >= 1 || (n2 >= 1 && n1 >= 1) || n1 >= 3) return 3;
  if (n2 >= 1 || n1 >= 2) return 2;
  return n1 >= 1 ? 1 : 0;
}

export interface OddsCard {
  cost: number;
  isCharacter: boolean;
  qty: number;
}

export interface HandStats {
  deckSize: number;
  /** P(2 plays or more chained on day 1). */
  tempo: number;
  /** P(3 cards or more costing 4+). */
  heavy: number;
  /** P(most mana spent on day 1 = k), k = 0…3. */
  manaSpent: number[];
  /** P(exactly k cards costing 4+), k = 0…hand size. */
  expensive: number[];
  /** P(most cards playable on day 1 = k), capped at 3. */
  plays: number[];
  /** P(most characters playable on day 1 = k), capped at 2. */
  expeditions: number[];
}

/** Every opening hand of `handSize`, weighted exactly, grouped by (cost ≤ 5, character or not). */
export function handStats(cards: OddsCard[], handSize: number): HandStats {
  const byKey = new Map<string, { cost: number; isChar: boolean; size: number }>();
  let N = 0;
  for (const c of cards) {
    const cost = Math.min(Math.max(Math.trunc(c.cost) || 0, 0), 5);
    const key = `${cost}${c.isCharacter ? 'C' : 'N'}`;
    const b = byKey.get(key) ?? { cost, isChar: c.isCharacter, size: 0 };
    b.size += c.qty;
    byKey.set(key, b);
    N += c.qty;
  }
  const buckets = [...byKey.values()];
  const hs = Math.min(handSize, N);
  const denom = binom(N, hs);
  const acc: HandStats = {
    deckSize: N,
    tempo: 0,
    heavy: 0,
    manaSpent: [0, 0, 0, 0],
    expensive: new Array<number>(hs + 1).fill(0),
    plays: [0, 0, 0, 0],
    expeditions: [0, 0, 0],
  };
  const m = buckets.length;
  const counts = new Array<number>(m).fill(0);
  const rec = (i: number, remaining: number, num: bigint): void => {
    if (i === m - 1) {
      if (remaining > buckets[i].size) return;
      counts[i] = remaining;
      const total = num * binom(buckets[i].size, remaining);
      if (total === 0n) return;
      const w = ratio(total, denom);
      if (w <= 0) return;
      const n = [0, 0, 0, 0];
      const cn = [0, 0, 0, 0];
      let nGe4 = 0;
      for (let b = 0; b < m; b++) {
        const c = buckets[b].cost;
        const k = counts[b];
        if (c <= 3) {
          n[c] += k;
          if (buckets[b].isChar) cn[c] += k;
        } else nGe4 += k;
      }
      if (canPlayTwo(n[0], n[1], n[2], n[3])) acc.tempo += w;
      if (nGe4 >= 3) acc.heavy += w;
      acc.manaSpent[maxManaSpend(n[1], n[2], n[3])] += w;
      acc.expensive[nGe4] += w;
      acc.plays[Math.min(maxPlayable(n[0], n[1], n[2], n[3]), 3)] += w;
      acc.expeditions[Math.min(maxPlayable(cn[0], cn[1], cn[2], cn[3]), 2)] += w;
      return;
    }
    const maxK = Math.min(remaining, buckets[i].size);
    for (let k = 0; k <= maxK; k++) {
      counts[i] = k;
      rec(i + 1, remaining - k, num * binom(buckets[i].size, k));
    }
  };
  if (m > 0) rec(0, hs, 1n);
  return acc;
}

/** Deck cards for the calculators: uniques one by one, other cards by name and rarity. */
export interface OddsGroup {
  id: number;
  key: string;
  /** Reference of the first line of the group (its image). */
  reference: string;
  name: string;
  /** C, R, U or E. */
  rarity: string;
  type: string;
  mainCost: number;
  recallCost: number;
  qty: number;
  unique: boolean;
}

const TYPE_ORDER = ['CHARACTER', 'SPELL', 'PERMANENT', 'LANDMARK_PERMANENT', 'EXPEDITION_PERMANENT', 'TOKEN'];

export function oddsGroups(lines: HydratedLine[]): OddsGroup[] {
  const groups = new Map<string, OddsGroup>();
  for (const { card, quantity } of lines) {
    const type = typeOf(card);
    if (type === 'HERO' || quantity <= 0) continue;
    const name = localizedText(card.name, contentLocale()) || card.reference;
    const rarity = rarityOf(card)[0];
    const unique = isUniqueReference(card.reference);
    const key = unique ? card.reference : `${name}|${rarity}`;
    const g = groups.get(key);
    if (g) g.qty += quantity;
    else
      groups.set(key, {
        id: groups.size,
        key,
        reference: card.reference,
        name,
        rarity,
        type,
        mainCost: card.mainCost ?? 0,
        recallCost: card.recallCost ?? 0,
        qty: quantity,
        unique,
      });
  }
  const rank = (t: string) => (TYPE_ORDER.includes(t) ? TYPE_ORDER.indexOf(t) : TYPE_ORDER.length);
  return [...groups.values()].sort(
    (a, b) => rank(a.type) - rank(b.type) || a.mainCost - b.mainCost || a.recallCost - b.recallCost || a.name.localeCompare(b.name, contentLocale()),
  );
}

/** Card pool of the odds: every non-hero card with its main cost. */
export function oddsCards(lines: HydratedLine[]): OddsCard[] {
  return lines
    .filter((l) => typeOf(l.card) !== 'HERO' && l.quantity > 0)
    .map((l) => ({ cost: l.card.mainCost ?? 0, isCharacter: typeOf(l.card) === 'CHARACTER', qty: l.quantity }));
}

/** Best proper fraction with a denominator ≤ 5 (0.72 → 3/4); `null` for 0 and 1. */
export function bestFraction(p: number): { x: number; y: number } | null {
  if (p <= 0 || p >= 1) return null;
  let best: { x: number; y: number } | null = null;
  let bestErr = Infinity;
  for (let y = 1; y <= 5; y++) {
    const x = Math.round(p * y);
    if (x <= 0 || x >= y) continue;
    const err = Math.abs(p - x / y);
    if (err < bestErr - 1e-12) {
      bestErr = err;
      best = { x, y };
    }
  }
  return best;
}

/** Rounded percentage with its extremes: 0 %, « < 1 % », « > 99 % », 100 %. */
export function formatPercent(p: number, locale: string): string {
  const pct = (v: number, digits = 0) => new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: digits }).format(v);
  if (p <= 0) return pct(0);
  if (p >= 1) return pct(1);
  if (p < 0.01) return `< ${pct(0.01)}`;
  if (p > 0.99) return `> ${pct(0.99)}`;
  return pct(p);
}

/** Two-decimal percentage (tooltip of the headline numbers). */
export function formatPrecisePercent(p: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(p);
}
