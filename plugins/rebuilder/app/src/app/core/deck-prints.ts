import type { AltArtOverrides, Deck, PrintQuantity } from './models';
import { deckLines } from './models';

/**
 * Prints and gameplay identity. The decks API stores a deck by gameplay card: one canonical reference per family
 * (`{FACTION}_{NUM}`, e.g. `AX_04`) and rarity (booster print of the card's first set; a Unique keeps its own reference),
 * and the print a copy shows (alt art `_A_`, promo `_P_`, reprint) as the deck's `altArtOverrides`, keyed by canonical
 * reference. A copy without an override shows the player's global preference (ownership service).
 *
 * The editor keeps its lines as concrete prints (what it shows) and, by family + rarity (`printKey`), the prints the deck
 * pins, 1st copy first (`pins`), the canonical print included (the base art forced in this deck). Only an explicit
 * override pins. This file goes from one to the other.
 */

/** Parts of a card reference `ALT_{SET}_{PRODUCT}_{FACTION}_{NUM}_{RARITY}[_{SERIAL}]`. */
export interface PrintParts {
  set: string;
  product: string;
  faction: string;
  /** Collector number, two digits at least (`04`). */
  number: string;
  /** `C`, `R1`, `R2`, `E`, `U`. */
  rarity: string;
  /** Unique serial, `null` otherwise. */
  serial: string | null;
}

const REFERENCE = /^ALT_([A-Z0-9]+)_([A-Z]+)_([A-Z]{2})_(\d+)_([A-Z]\d*)(?:_(\d+))?$/;

export function printParts(reference: string): PrintParts | null {
  const m = REFERENCE.exec(reference);
  if (!m) return null;
  return { set: m[1], product: m[2], faction: m[3], number: m[4].padStart(2, '0'), rarity: m[5], serial: m[6] ?? null };
}

/** Card family, as the decks API counts copies (`AX_04`): every rarity, set and print of the card. */
export function familyOf(reference: string): string | null {
  const p = printParts(reference);
  return p ? `${p.faction}_${p.number}` : null;
}

/**
 * The gameplay card of a print: family + rarity (`AX_04_R1`); a Unique is its own card (its reference). Two prints with
 * the same key are the same card for the decks API (one canonical reference, the others are overrides).
 */
export function printKey(reference: string): string {
  const p = printParts(reference);
  if (!p || p.serial !== null || p.rarity === 'U') return reference;
  return `${p.faction}_${p.number}_${p.rarity}`;
}

/**
 * The canonical reference of a print when its reference tells it: itself for a booster print (`_B_`) or a Unique, the
 * `CORE` print of a Kickstarter one (`COREKS`). `null` for an alt art, a promo or an unknown shape: only the decks API
 * knows its card (`canonicalCards`).
 */
export function guessCanonical(reference: string): string | null {
  const p = printParts(reference);
  if (!p) return null;
  if (p.serial !== null || p.rarity === 'U') return reference;
  if (p.product !== 'B') return null;
  return p.set === 'COREKS' ? reference.replace('_COREKS_', '_CORE_') : reference;
}

/** A print the deck must pin to show: not its card's canonical reference (as far as the reference tells). */
export function isPinnedPrint(reference: string, canonical?: string | null): boolean {
  return reference !== (canonical ?? guessCanonical(reference));
}

/** `items` as consecutive runs of the same reference (`['A', 'A', 'B']` → `A ×2, B ×1`). */
export function runs(items: readonly string[]): PrintQuantity[] {
  const out: PrintQuantity[] = [];
  for (const reference of items) {
    const last = out.at(-1);
    if (last && last.reference === reference) last.quantity++;
    else out.push({ reference, quantity: 1 });
  }
  return out;
}

/** Runs back to one entry a copy. */
export function expand(runs: readonly PrintQuantity[] | null | undefined): string[] {
  return (runs ?? []).flatMap((r) => Array<string>(Math.max(0, r.quantity)).fill(r.reference));
}

/** What a deck's reading gives the editor: the prints pinned by key, and the canonical reference of each key it knows. */
export interface DeckPrints {
  pins: Map<string, string[]>;
  canonical: Map<string, string>;
  tokens: PrintQuantity[];
}

/**
 * The deck's pins and canonical references. With the decks API's `canonicalCards`: its `altArtOverrides`. Without (the
 * former decks API, a guest deck): every copy whose reference is not canonical (alt art, promo) is pinned to it.
 */
export function readDeckPrints(deck: Deck, heroReference?: string | null): DeckPrints {
  const pins = new Map<string, string[]>();
  const canonical = new Map<string, string>();
  const tokens = [...(deck.altArtOverrides?.tokens ?? [])].filter((t) => t.quantity > 0);
  if (deck.canonicalCards?.length) {
    const overrides = deck.altArtOverrides?.cards ?? {};
    for (const line of deck.canonicalCards) {
      const key = printKey(line.cardReference);
      canonical.set(key, line.cardReference);
      // A pin on the canonical print itself is a real choice: the base art in this deck, over the global preferences.
      const pinned = expand(overrides[line.cardReference]).slice(0, line.quantity);
      if (pinned.length) pins.set(key, pinned);
    }
    return { pins, canonical, tokens };
  }
  const lines = deckLines(deck);
  const all = heroReference && !lines.some((l) => l.cardReference === heroReference) ? [{ cardReference: heroReference, quantity: 1 }, ...lines] : lines;
  for (const line of all) {
    const guess = guessCanonical(line.cardReference);
    const key = printKey(line.cardReference);
    if (guess === line.cardReference) canonical.set(key, guess);
    if (!isPinnedPrint(line.cardReference)) continue;
    pins.set(key, [...(pins.get(key) ?? []), ...Array<string>(line.quantity).fill(line.cardReference)]);
  }
  return { pins, canonical, tokens };
}

/**
 * The deck as written to the decks API: one canonical reference per card with its copies (hero first), and the pinned
 * prints as `altArtOverrides` (capped to the copies; a pin on the canonical print itself is kept: the base art in this
 * deck, over the player's global preferences). A canonical line without an override is never a pin.
 * `lines`: the concrete prints shown, hero included. A card whose canonical reference is unknown is sent by one of its
 * prints: the decks API resolves it (and keeps that print).
 */
export function deckWriteCards(
  lines: readonly { reference: string; quantity: number }[],
  pins: ReadonlyMap<string, readonly string[]>,
  canonical: ReadonlyMap<string, string>,
  tokens: readonly PrintQuantity[] = [],
): { deckCards: { cardReference: string; quantity: number }[]; altArtOverrides: AltArtOverrides } {
  const groups = new Map<string, { refs: string[]; quantity: number }>();
  for (const l of lines) {
    if (l.quantity <= 0) continue;
    const key = printKey(l.reference);
    const g = groups.get(key) ?? { refs: [], quantity: 0 };
    g.refs.push(l.reference);
    g.quantity += l.quantity;
    groups.set(key, g);
  }
  const deckCards: { cardReference: string; quantity: number }[] = [];
  const cards: Record<string, PrintQuantity[]> = {};
  for (const [key, g] of groups) {
    const reference = canonical.get(key) ?? g.refs.find((r) => guessCanonical(r) === r) ?? g.refs.map(guessCanonical).find((r): r is string => !!r) ?? g.refs[0];
    deckCards.push({ cardReference: reference, quantity: g.quantity });
    const pinned = (pins.get(key) ?? []).slice(0, g.quantity);
    if (pinned.length) cards[reference] = runs(pinned);
  }
  return { deckCards, altArtOverrides: { cards, tokens: tokens.filter((t) => t.quantity > 0).map((t) => ({ reference: t.reference, quantity: t.quantity })) } };
}

/** The canonical references a decks API answer tells (keys of its overrides, its `canonicalCards`), by key. */
export function canonicalFromAnswer(deck: Pick<Deck, 'canonicalCards' | 'altArtOverrides'>): Map<string, string> {
  const out = new Map<string, string>();
  for (const l of deck.canonicalCards ?? []) out.set(printKey(l.cardReference), l.cardReference);
  for (const ref of Object.keys(deck.altArtOverrides?.cards ?? {})) out.set(printKey(ref), ref);
  return out;
}
