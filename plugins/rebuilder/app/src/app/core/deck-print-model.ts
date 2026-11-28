import { signal } from '@angular/core';
import { basePrint, counts, defaultPrints, familyPrints, linesWithPins, sameCopies, slotDefaults, withFamilyPrints } from './alt-art-defaults';
import { canonicalFromAnswer, deckWriteCards, guessCanonical, isPinnedPrint, printKey, readDeckPrints } from './deck-prints';
import type { AltArtChoice } from './ownership-api.service';
import type { Card, Deck, DeckHero, DeckWrite, HydratedLine, PrintQuantity } from './models';

/**
 * Print/pin/token-override state for one deck in the editor.
 * Keeps `pins` (`altArtOverrides.cards` by `printKey`), `tokenPrints` (`altArtOverrides.tokens`),
 * and the `canonical` reference map learned from the decks API and booster prints.
 */
export class DeckPrintModel {
  /**
   * The prints the deck chooses itself, 1st copy first, by card (`printKey`, family + rarity): its `altArtOverrides`.
   * The other copies of a card follow the player's global preferences.
   */
  readonly pins = signal<ReadonlyMap<string, readonly string[]>>(new Map());
  /** The deck's token prints (`altArtOverrides.tokens`). */
  readonly tokenPrints = signal<readonly PrintQuantity[]>([]);
  /** Canonical reference of each card the decks API told (`canonicalCards`, override keys), by `printKey`. */
  private canonical = new Map<string, string>();

  /** Loads pins, canonical map and token prints from a deck payload. */
  load(deck: Deck, heroReference?: string | null): void {
    const prints = readDeckPrints(deck, heroReference);
    this.pins.set(prints.pins);
    this.canonical = prints.canonical;
    this.tokenPrints.set(prints.tokens);
  }

  /** Clears all pin, canonical and token-print state. */
  reset(): void {
    this.pins.set(new Map());
    this.tokenPrints.set([]);
    this.canonical = new Map();
  }

  /** Remembers a print's canonical reference when its reference tells it (a booster print added from the search). */
  learn(reference: string): void {
    const key = printKey(reference);
    if (reference && guessCanonical(reference) === reference && !this.canonical.has(key)) this.canonical.set(key, reference);
  }

  /** Absorbs canonical references returned by the decks API after a save. */
  absorbAnswer(deck: Pick<Deck, 'canonicalCards' | 'altArtOverrides'>): void {
    for (const [key, ref] of canonicalFromAnswer(deck)) this.canonical.set(key, ref);
  }

  /** The prints the deck pins for `card`'s card, 1st copy first. */
  pinsOf(card: Pick<Card, 'reference'>): readonly string[] {
    return this.pins().get(printKey(card.reference)) ?? [];
  }

  setPinsOf(key: string, pinned: readonly string[]): void {
    const current = this.pins().get(key) ?? [];
    if (current.length === pinned.length && current.every((r, i) => r === pinned[i])) return;
    this.pins.update((m) => {
      const next = new Map(m);
      if (pinned.length) next.set(key, [...pinned]);
      else next.delete(key);
      return next;
    });
  }

  /**
   * The pins of `reference`'s card after its line went from `before` to `after` copies. An added copy of a print that is
   * not its card's canonical one is pinned to it (an alt art or a promo picked from the search), unless the line's
   * copies show the player's preference (not pinned); a removed copy is a free one first.
   */
  repin(reference: string, before: number, after: number, keyTotalWithHero: number): void {
    const key = printKey(reference);
    const pinned = [...(this.pins().get(key) ?? [])];
    const own = pinned.filter((r) => r === reference).length;
    if (after > before && isPinnedPrint(reference, this.canonical.get(key)) && (before === 0 || own >= before)) {
      pinned.push(...Array<string>(after - before).fill(reference));
    } else if (after < before) {
      let drop = Math.max(0, before - after - (before - own));
      for (let i = pinned.length - 1; i >= 0 && drop > 0; i--) {
        if (pinned[i] !== reference) continue;
        pinned.splice(i, 1);
        drop--;
      }
    }
    this.setPinsOf(key, pinned.slice(0, keyTotalWithHero));
  }

  /** Replaces hero pins when switching hero in settings. */
  replaceHero(previousHero: DeckHero | null, nextHero: DeckHero): void {
    if (previousHero) this.setPinsOf(printKey(previousHero.reference), []);
    for (const [key, prints] of heroPins(nextHero)) this.setPinsOf(key, prints);
    this.learn(nextHero.reference);
  }

  /**
   * « Pour ce deck »: pins `pinned` for `card`'s family and returns the updated lines (if any changed).
   * Returns `null` when the pins did not change.
   */
  pinPrints(
    card: Card,
    lines: readonly HydratedLine[],
    choice: AltArtChoice | null,
    members: ReadonlySet<string>,
    pinned: readonly string[],
  ): { nextLines?: HydratedLine[] } | null {
    const key = printKey(card.reference);
    const prints = familyPrints(lines, members);
    const kept = pinned.slice(0, prints.length);
    const before = this.pinsOf(card);
    if (before.length === kept.length && before.every((r, i) => r === kept[i])) return null;
    if (choice) this.learn(basePrint(choice));
    this.setPinsOf(key, kept);
    if (choice && prints.length) {
      const shown = slotDefaults(choice, [...kept, ...Array<null>(prints.length - kept.length).fill(null)]);
      if (!sameCopies(prints, shown)) return { nextLines: withFamilyPrints(lines, members, card, shown) };
    }
    return {};
  }

  /**
   * Updates a card family's total copy count while preserving pinned copies first and filling the rest
   * with the player's global preferences. Returns `null` if the count did not change.
   */
  setFamilyQuantity(
    card: Card,
    lines: readonly HydratedLine[],
    choice: AltArtChoice,
    members: ReadonlySet<string>,
    target: number,
  ): { nextLines: HydratedLine[]; lastChange: { card: Card; quantity: number; delta: number } } | null {
    const prints = familyPrints(lines, members);
    if (target === prints.length) return null;
    const key = printKey(card.reference);
    const pinned = (this.pins().get(key) ?? []).slice(0, target);
    const next = slotDefaults(choice, [...pinned, ...Array<null>(target - pinned.length).fill(null)]);
    const delta = target > prints.length ? 1 : -1;
    const was = counts(prints);
    const now = counts(next);
    const grew = (r: string) => (now.get(r) ?? 0) > (was.get(r) ?? 0);
    const shrank = (r: string) => (now.get(r) ?? 0) < (was.get(r) ?? 0);
    const reference = (delta > 0 ? [...now.keys()].find(grew) : [...was.keys()].find(shrank)) ?? card.reference;
    this.learn(card.reference);
    this.learn(basePrint(choice));
    this.setPinsOf(key, pinned);
    return {
      nextLines: withFamilyPrints(lines, members, card, next),
      lastChange: { card: printOf(card, reference), quantity: now.get(reference) ?? 0, delta },
    };
  }

  /**
   * Applies the player's global alt-art preferences to unpinned copies and hero (display only; does not dirty).
   */
  applyPreferences(
    lines: readonly HydratedLine[],
    hero: DeckHero | null,
    choices: Readonly<Record<string, AltArtChoice>>,
  ): { nextLines?: HydratedLine[]; nextHero?: DeckHero } {
    for (const choice of new Set(Object.values(choices))) this.learn(basePrint(choice));
    const nextLines = linesWithPins(lines, choices, this.pins()) ?? undefined;
    const heroChoice = hero ? choices[hero.reference] : undefined;
    if (!hero || !heroChoice || this.pinsOf(hero).length) return { nextLines };
    const shown = defaultPrints(heroChoice, 1)[0];
    const nextHero = shown && shown !== hero.reference ? { ...hero, reference: shown } : undefined;
    return { nextLines, nextHero };
  }

  /** Drops every deck pin (`false` when none were pinned). */
  clearPins(): boolean {
    if (!this.pins().size) return false;
    this.pins.set(new Map());
    return true;
  }

  /** The deck's print of a token family (`family`: its prints), `null` when following player preference. */
  tokenPrintOf(family: readonly string[]): string | null {
    return this.tokenPrints().find((t) => family.includes(t.reference))?.reference ?? null;
  }

  /** Sets a deck-specific token print (`null`: back to player preference). */
  setTokenPrint(family: readonly string[], reference: string | null): void {
    const others = this.tokenPrints().filter((t) => !family.includes(t.reference));
    this.tokenPrints.set(reference ? [...others, { reference, quantity: 1 }] : others);
  }

  /** Serializes `deckCards` (canonical) and `altArtOverrides` for API writes. */
  writeCards(shownLines: readonly { reference: string; quantity: number }[], includePins = true): Pick<DeckWrite, 'deckCards' | 'altArtOverrides'> {
    return includePins
      ? deckWriteCards(shownLines, this.pins(), this.canonical, this.tokenPrints())
      : deckWriteCards(shownLines, new Map(), this.canonical);
  }
}

export function heroLine(hero: DeckHero) {
  return {
    cardReference: hero.reference,
    quantity: 1,
    name: hero.name,
    factionCode: hero.faction,
    cardTypeReference: 'HERO',
  };
}

/** The hero as the deck stores it (without how it was picked). */
export function plainHero(hero: DeckHero): DeckHero {
  return { reference: hero.reference, name: hero.name, faction: hero.faction };
}

/** The hero's pin: the print picked with « Alt arts » when it is not the canonical one; none for its preference. */
export function heroPins(hero: DeckHero): Map<string, string[]> {
  return !hero.defaultArt && isPinnedPrint(hero.reference) ? new Map([[printKey(hero.reference), [hero.reference]]]) : new Map();
}

/** `card` as another print of the same card (`reference`). */
export function printOf(card: Card, reference: string): Card {
  return reference === card.reference ? card : { ...card, reference, imagePath: undefined };
}

/**
 * Converts a local guest deck into a `DeckWrite` payload for saving on the signed-in account.
 * Shared by `DecksCatalogStore.saveLocalDecks()` so local-to-account migration stays consistent.
 */
export function guestDeckToWrite(deck: Deck): DeckWrite {
  return {
    name: deck.name,
    description: deck.description ?? '',
    format: deck.format,
    isPublic: false,
    // Not a draft: the decks API validates the deck (its prints are kept as the deck's own).
    isDraft: false,
    deckCards: [
      ...(deck.hero ? [{ cardReference: deck.hero.reference, quantity: 1 }] : []),
      ...(deck.deckCards ?? []).filter((l) => l.cardReference !== deck.hero?.reference).map((l) => ({ cardReference: l.cardReference, quantity: l.quantity })),
    ],
  };
}
