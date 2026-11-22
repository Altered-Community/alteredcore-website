/**
 * `decks.csv` of the altered.gg personal-data export (Equinox): semicolon-separated, a header row,
 * one row per (deck, card). Columns read: [0] deck id, [1] name, [2] format, [3] hero, [5] card
 * reference, [7] quantity. Port of the site's `equinox-deck-import` plugin (`DeckParser`).
 */

export interface DeckCardRef {
  cardReference: string;
  quantity: number;
}

export interface EquinoxDeck {
  name: string;
  /** As exported, lowercased; `standard` when empty. */
  format: string;
  hero: string;
  /** The exported cards (the hero is usually not among them: see `withHero`). */
  cards: DeckCardRef[];
}

const REFERENCE = /^ALT_[A-Z0-9_]+$/;
const MAX_QUANTITY = 99;

/** A card the decks API gets: `ALT_…` reference, 1 to 99 copies (the site's importer `Card`). */
export function validCards(cards: DeckCardRef[]): boolean {
  return cards.every((c) => REFERENCE.test(c.cardReference) && Number.isInteger(c.quantity) && c.quantity >= 1 && c.quantity <= MAX_QUANTITY);
}

/**
 * One CSV line, read like PHP's `str_getcsv($line, ';', '"')` (the site's importer): a `"` opens a
 * quoted field only at the start of a field (elsewhere it is a plain character), `""` inside quotes
 * is a quote, and what follows the closing quote up to the next `;` is kept.
 */
export function splitCsvLine(line: string): string[] {
  const cols: string[] = [];
  let i = 0;
  for (;;) {
    let field = '';
    while (line[i] === ' ' || line[i] === '\t') field += line[i++];
    if (line[i] === '"') {
      field = '';
      i++;
      for (; i < line.length; i++) {
        if (line[i] !== '"') field += line[i];
        else if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          i++;
          break;
        }
      }
    }
    while (i < line.length && line[i] !== ';') field += line[i++];
    cols.push(field);
    if (i >= line.length) return cols;
    i++;
  }
}

export function parseEquinoxCsv(raw: string): EquinoxDeck[] {
  const decks = new Map<string, { name: string; format: string; hero: string; cards: Map<string, number> }>();
  const lines = raw.replace(/^\uFEFF/, '').replace(/\r/g, '').split('\n');
  let header = true;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (header) {
      header = false;
      continue;
    }
    const cols = splitCsvLine(line);
    if (cols.length < 8) continue;
    const id = cols[0].trim();
    if (!id) continue;
    let deck = decks.get(id);
    if (!deck) {
      deck = { name: cols[1].trim(), format: cols[2].trim().toLowerCase() || 'standard', hero: cols[3].trim().toUpperCase(), cards: new Map() };
      decks.set(id, deck);
    }
    const reference = cols[5].trim().toUpperCase();
    const quantity = Number.parseInt(cols[7].trim(), 10);
    if (!REFERENCE.test(reference) || !(quantity > 0)) continue;
    deck.cards.set(reference, (deck.cards.get(reference) ?? 0) + quantity);
  }
  return [...decks.values()].map((d) => {
    const cards = [...d.cards].filter(([, q]) => q <= MAX_QUANTITY).map(([cardReference, quantity]) => ({ cardReference, quantity }));
    return { name: d.name, format: d.format, hero: d.hero, cards };
  });
}

/** The deck's cards with its hero first (quantity 1), unless the export already lists it. */
export function withHero(hero: string, cards: DeckCardRef[]): DeckCardRef[] {
  if (!REFERENCE.test(hero) || cards.some((c) => c.cardReference === hero)) return cards;
  return [{ cardReference: hero, quantity: 1 }, ...cards];
}

/** Same name (case and spaces aside) and same cards: the deck is already in the account. */
export function sameDeck(a: { name: string; cards: DeckCardRef[] }, b: { name: string; cards: DeckCardRef[] }): boolean {
  return a.name.trim().toLowerCase() === b.name.trim().toLowerCase() && contentKey(a.cards) === contentKey(b.cards);
}

function contentKey(cards: DeckCardRef[]): string {
  const sum = new Map<string, number>();
  for (const c of cards) {
    const ref = c.cardReference.trim().toUpperCase();
    if (ref) sum.set(ref, (sum.get(ref) ?? 0) + (c.quantity || 1));
  }
  return [...sum].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([r, q]) => `${r}:${q}`).join(',');
}
