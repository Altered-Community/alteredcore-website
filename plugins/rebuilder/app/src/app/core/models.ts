export type Locale = 'en' | 'fr';

export type RarityRef = 'COMMON' | 'RARE' | 'UNIQUE' | 'EXALTED' | string;
export type CardTypeRef =
  | 'CHARACTER'
  | 'SPELL'
  | 'LANDMARK_PERMANENT'
  | 'PERMANENT'
  | 'HERO'
  | 'TOKEN'
  | string;

export type Localized = Record<string, string | undefined>;

export interface Faction {
  id?: number;
  name: string;
  code: string;
  position?: number;
}

export interface HeroGroup {
  slug: string;
  name: string;
  faction: string;
  /** Standard-print reference (ALT_{SET}_B_{FACTION}_NN_C) used in decks and for art. */
  reference: string;
  /** Every print of the hero (promo, alt arts, trophy prints), for the « Alt arts » choice. */
  prints: { reference: string; variation: string }[];
}

export interface CardType {
  id?: number;
  reference: CardTypeRef;
  name?: Localized | string;
}

export interface CardSet {
  name?: string;
  code?: string;
  reference?: string;
}

export interface CardRarity {
  id?: number;
  reference: RarityRef;
}

export interface Card {
  reference: string;
  name?: Localized | string;
  rarity?: CardRarity;
  faction?: Faction;
  cardType?: CardType;
  cardSubTypes?: { reference?: string; name?: Localized | string }[];
  mainCost?: number | null;
  recallCost?: number | null;
  displayPowers?: {
    forest?: number | null;
    mountain?: number | null;
    ocean?: number | null;
  };
  forestPower?: number | null;
  mountainPower?: number | null;
  oceanPower?: number | null;
  mainEffect?: Localized | string | null;
  echoEffect?: Localized | string | (Localized | string)[] | null;
  /** Printed collector number, e.g. `ROC-002-U-1`: tells two uniques of the same card apart. */
  collectorNumberFormatedId?: string;
  /** Unique whose faction differs from the printed card it belongs to. */
  transfuge?: boolean;
  artists?: { name: string }[];
  /** `/api/cards?locale=` returns a URL string; batch and card groups return a locale map. */
  imagePath?: Localized | string;
  set?: CardSet;
  isBanned?: boolean;
  isErrated?: boolean;
  isSuspended?: boolean;
  /** Formats a Unique is played in (`['FRONTIER']` when it is on the Frontier list), from the cards API. */
  gameplayFormat?: string[];
}

export interface CardCollection {
  member: Card[];
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  lastPage: number;
}

export type CardOrder =
  | 'setDate-desc'
  | 'setDate-asc'
  | 'name-asc'
  | 'name-desc'
  | 'number-asc'
  | 'number-desc'
  | 'collector-asc'
  | 'collector-desc'
  | 'mainCost-asc'
  | 'mainCost-desc'
  | 'recallCost-asc'
  | 'recallCost-desc'
  | 'forestPower-asc'
  | 'forestPower-desc'
  | 'mountainPower-asc'
  | 'mountainPower-desc'
  | 'oceanPower-asc'
  | 'oceanPower-desc'
  | 'random';

export interface CardSearchParams {
  page?: number;
  itemsPerPage?: number;
  q?: string;
  factions?: string[];
  types?: string[];
  rarities?: string[];
  sets?: string[];
  variations?: string[];
  mainCosts?: number[];
  recallCosts?: number[];
  forestPowers?: number[];
  mountainPowers?: number[];
  oceanPowers?: number[];
  subtypes?: string[];
  costRelation?: 'equal' | 'mainHigher' | 'recallHigher';
  order?: CardOrder;
  hasNoEffect?: boolean;
  /** At least one power at 0 (unified search `hasZeroPower`). */
  hasZeroPower?: boolean;
  /** Artists, exact names (unified search `artist[]`). */
  artists?: string[];
  /** Words of the card's text (unified search `effectText`; the cards API has no such filter). */
  effectText?: string;
  locale?: Locale;
}

export type DeckFormat =
  | 'standard'
  | 'nuc'
  | 'singleton'
  | 'singleton_nuc'
  | 'sandbox'
  | 'test'
  | 'frontier'
  | 'sealed';

export interface DeckCardLine {
  cardReference: string;
  quantity: number;
  name?: string | Localized | null;
  /** Present on decks API detail responses. */
  factionCode?: string | null;
  cardTypeReference?: string | null;
  mainCost?: number | null;
  recallCost?: number | null;
  forestPower?: number | null;
  mountainPower?: number | null;
  oceanPower?: number | null;
  /**
   * Printed effect, kept on guest lines so Aperçu can draw a unique after a reload.
   * The decks API does not return these: its `effects` entries are ability parts, not the printed string.
   */
  mainEffect?: Card['mainEffect'];
  echoEffect?: Card['echoEffect'];
  /**
   * Cards API status, kept on guest lines so the editor still flags a banned or suspended card after a reload.
   * Decks API lines do not carry it (see `docs/api-limitations/decks-api.md`).
   */
  isBanned?: boolean;
  isSuspended?: boolean;
}

export interface DeckStats {
  totalCards?: number;
  character?: number;
  rare?: number;
  unique?: number;
  exalted?: number;
  hero?: { reference: string; name?: string | null } | null;
  byRarity?: { C?: number; R?: number; U?: number; E?: number } | null;
}

/** One legality problem of a deck, from the decks API (`errors`), translated with `?locale=`. */
export interface DeckIssue {
  /** Stable code (`card.family.copies`, `deck.size`…), see the decks API's `Validation/ValidationError.cs`. */
  code: string;
  /** The card the problem is about (canonical reference), `null` for a deck-level problem. */
  reference: string | null;
  message: string;
}

/** A print and its copies (an override line). */
export interface PrintQuantity {
  reference: string;
  quantity: number;
}

/**
 * The deck's own art choices (decks API): by canonical reference, the prints its copies take, 1st copy first (the
 * copies past them follow the player's global preferences); `tokens`: the deck's token prints.
 */
export interface AltArtOverrides {
  cards?: Record<string, PrintQuantity[]> | null;
  tokens?: PrintQuantity[] | null;
}

/** A tournament a deck was played in (decks API `tournaments`, synced from the BGA tournaments). */
export interface DeckTournamentResult {
  tournamentParentId?: number;
  name?: string | null;
  /** `bo1`, `bo3`… */
  mode?: string | null;
  games?: number;
  wins?: number;
  losses?: number;
  lastPlayedAt?: string | null;
}

export interface Deck {
  id: string;
  name: string;
  description?: string | null;
  format?: DeckFormat | null;
  isPublic?: boolean;
  isDraft?: boolean;
  legal?: boolean;
  /** Messages of `errors` (translated with `?locale=` by the decks API). */
  formatErrors?: string[] | null;
  legalityDetail?: Record<string, boolean> | string[] | null;
  /** Legality problems (decks API); absent from the former decks API. */
  errors?: DeckIssue[] | null;
  /** The concrete prints (deck overrides applied) on the item GET, as the former API. */
  cards?: DeckCardLine[];
  deckCards?: DeckCardLine[];
  /** Item GET: the stored list, one canonical reference per gameplay card (family + rarity). */
  canonicalCards?: { cardReference: string; quantity: number }[] | null;
  altArtOverrides?: AltArtOverrides | null;
  /** Deckfmt encoding of the list (hero included). */
  compressed?: string | null;
  stats?: DeckStats | null;
  viewCount?: number;
  upvoteCount?: number;
  /** Whether the caller liked the deck; `false` without a token. */
  hasUpvoted?: boolean;
  /** Owner; the API serialises it as `[]` while no user field is in the `deck:read` group. */
  user?: { username?: string | null } | unknown[] | null;
  /** Owner's pseudo, on public decks and public listings. */
  owner?: { pseudo?: string | null } | null;
  /** `tournament`: imported from a BGA tournament list; `user`: made in a deckbuilder. */
  source?: 'user' | 'tournament' | null;
  /** Tournaments the deck was played in, with its record in each. */
  tournaments?: DeckTournamentResult[] | null;
  createdAt?: string;
  updatedAt?: string | null;
  /** Local-only guest deck (never sent to DECKS_API). */
  guest?: boolean;
  /** Local-only denormalised hero, so the deck list renders without hydrating cards. */
  hero?: DeckHero | null;
}

export interface DeckHero {
  reference: string;
  name: string;
  faction: string;
  /**
   * Picked without « Alt arts »: the deck pins no print for it, the player's global preference shows (`DeckStore`).
   */
  defaultArt?: boolean;
}

export interface DeckWrite {
  name: string;
  description?: string | null;
  format?: DeckFormat | null;
  isPublic?: boolean;
  isDraft?: boolean;
  /** Canonical references (one per family + rarity) and their copies, hero included. */
  deckCards: { cardReference: string; quantity: number }[];
  /** The deck's print choices; absent: the API keeps those of the prints sent in `deckCards`. */
  altArtOverrides?: AltArtOverrides | null;
}

export interface HydratedLine {
  card: Card;
  quantity: number;
}

export function localizedText(
  value: Localized | string | null | undefined,
  locale: Locale,
): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value[locale] || value['en'] || Object.values(value).find(Boolean) || '';
}

export function deckLines(deck: Deck | null | undefined): DeckCardLine[] {
  if (!deck) return [];
  return deck.deckCards ?? deck.cards ?? [];
}

export function rarityFromReference(ref: string): RarityRef {
  const m = /_([CRUE])\d*(?:_\d+)?$/.exec(ref);
  if (!m) return 'COMMON';
  switch (m[1]) {
    case 'C':
      return 'COMMON';
    case 'R':
      return 'RARE';
    case 'U':
      return 'UNIQUE';
    case 'E':
      return 'EXALTED';
    default:
      return 'COMMON';
  }
}
