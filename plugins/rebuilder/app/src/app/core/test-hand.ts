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

/** Zones of the game mode (the site's hand tester playground). */
export type PlayZone = 'hand' | 'mana' | 'board' | 'discard';

/**
 * Game mode: `setup` while 3 cards of the opening hand are chosen for mana, then `play` (draw, play to the board,
 * discard, put in mana). Every zone holds `DrawnCard` ids; `deck` is the draw pile, top first.
 */
export interface PlayState {
  phase: 'setup' | 'play';
  deck: number[];
  hand: number[];
  mana: number[];
  board: number[];
  discard: number[];
  /** Setup: the hand cards chosen for mana (3 at most). */
  manaPick: number[];
}

/** Cards put in mana at the start of the game. */
export const STARTING_MANA = 3;

/** A new game from a shuffled draw order (ids of the pool): the opening hand, the rest as the draw pile. */
export function newGame(order: readonly number[]): PlayState {
  const n = Math.min(HAND_SIZE, order.length);
  return { phase: 'setup', hand: order.slice(0, n), deck: order.slice(n), mana: [], board: [], discard: [], manaPick: [] };
}

/** Setup: picks or unpicks a hand card for mana (no more than 3). */
export function toggleManaPick(state: PlayState, id: number): PlayState {
  if (state.phase !== 'setup' || !state.hand.includes(id)) return state;
  if (state.manaPick.includes(id)) return { ...state, manaPick: state.manaPick.filter((p) => p !== id) };
  if (state.manaPick.length >= STARTING_MANA) return state;
  return { ...state, manaPick: [...state.manaPick, id] };
}

/** Setup: the 3 picked cards go to mana and the game starts. */
export function commitMana(state: PlayState): PlayState {
  if (state.phase !== 'setup' || state.manaPick.length !== STARTING_MANA) return state;
  return {
    ...state,
    phase: 'play',
    hand: state.hand.filter((id) => !state.manaPick.includes(id)),
    mana: [...state.mana, ...state.manaPick],
    manaPick: [],
  };
}

/** Play: the top card of the draw pile goes to the hand. */
export function drawCard(state: PlayState): PlayState {
  if (state.phase !== 'play' || !state.deck.length) return state;
  const [top, ...rest] = state.deck;
  return { ...state, deck: rest, hand: [...state.hand, top] };
}

/** Play: a card moves to another zone (placed at `index`, at the end by default). */
export function moveCard(state: PlayState, id: number, to: PlayZone, index?: number): PlayState {
  if (state.phase !== 'play') return state;
  const from = (['hand', 'mana', 'board', 'discard'] as const).find((z) => state[z].includes(id));
  if (!from) return state;
  const next = { ...state, [from]: state[from].filter((c) => c !== id) };
  const target = [...next[to]];
  target.splice(index ?? target.length, 0, id);
  return { ...next, [to]: target };
}
