import { Service, computed, effect, inject, signal, untracked } from '@angular/core';
import { EMPTY, type Observable, filter, map, of, switchMap, take, tap } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { AuthSession } from '../../core/auth-session';
import { basePrint, familyCopies, familyPrints, rankPrints, withRanks } from '../../core/alt-art-defaults';
import { DeckStore } from '../../core/deck-store';
import { isUniqueReference } from '../../core/card-art';
import { storedFlag } from '../../core/stored-flag';
import type { Card } from '../../core/models';
import { OwnershipApiService, familyKey, type AltArtChoice } from '../../core/ownership-api.service';
import type { AltArtPickerData, AltArtScope } from './alt-art-picker/alt-art-picker.overlay';
import { openConfirm } from '../shared/confirm/confirm.overlay';
import type { AcOverlayService } from '../../ui/overlay';

/** References asked to the site at once (`deck-alt-arts`, a GET with one parameter a reference). */
const CHUNK = 60;

/**
 * Illustrations in the editor (`core/alt-art-defaults.ts`). A deck's copies show, first, the prints the deck chooses
 * itself (its overrides, `DeckStore.pins`, saved with the deck by the decks API), then the player's global preferences
 * (default alt arts of the ownership service). The brush of a card changes its illustrations « pour ce deck » (the
 * deck's overrides) or « partout » (the player's preferences, `PUT /api/alt-arts/preferences`); « Arts par défaut »
 * gives the card, or the whole deck, back to the preferences. A print used more times than owned is flagged (Board Game
 * Arena shows the base art for the missing copies). Needs the ownership service and a signed-in player.
 */
@Service({ autoProvided: false })
export class EditorAltArts {
  private readonly deck = inject(DeckStore);
  private readonly ownership = inject(OwnershipApiService);
  private readonly auth = inject(AuthSession);
  readonly enabled = computed(() => !!this.ownership.baseUrl && this.auth.isLoggedIn());

  /** Family of each reference asked so far (`null`: one illustration only); the prints of a family share it. */
  private readonly known = signal<ReadonlyMap<string, AltArtChoice | null>>(new Map());
  private readonly asked = new Set<string>();
  /** Changes waiting for the family of their reference (a card added before its family arrived). */
  private readonly waiting = new Map<string, (() => void)[]>();

  /** References of the deck (hero included). */
  private readonly deckRefs = computed(() => {
    const refs = this.deck.lines().filter((l) => l.quantity > 0).map((l) => l.card.reference);
    const hero = this.deck.hero()?.reference;
    return hero ? [...refs, hero] : refs;
  });
  /** Families of the deck's references, by reference: unchanged while the deck's are (search results add others). */
  readonly choices = computed<Record<string, AltArtChoice>>(
    () => {
      const known = this.known();
      const out: Record<string, AltArtChoice> = {};
      for (const ref of this.deckRefs()) {
        const choice = known.get(ref);
        if (choice) out[ref] = choice;
      }
      return out;
    },
    {
      equal: (a, b) => {
        const keys = Object.keys(a);
        return keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k]);
      },
    },
  );
  /** Every reference of the deck has been asked to the service. */
  readonly ready = computed(() => this.deckRefs().every((r) => this.known().has(r)));
  private readonly ready$ = toObservable(this.ready).pipe(filter(Boolean), take(1));

  /** Why a line's print is short (owned copies under the copies of the deck), by reference. */
  readonly warnings = computed(() => {
    const out = new Map<string, string>();
    const choices = this.choices();
    for (const l of this.deck.lines()) {
      const owned = choices[l.card.reference]?.options.options.find((o) => o.reference === l.card.reference)?.ownedQuantity;
      if (owned != null && owned < l.quantity) {
        out.set(l.card.reference, $localize`:@@editor.altArt.stockWarn:Seulement ${owned}:owned: exemplaire(s) sur les ${l.quantity}:needed: utilisés dans ce deck sont possédés pour cette illustration : sur Board Game Arena, les autres auront l’illustration de base.`);
      }
    }
    return out;
  });

  /** The deck board (« Aperçu »): the prints of a card on one pile, copy 1 in front. Remembered in this browser. */
  readonly stackPrints = storedFlag('rebuilder.board.stackPrints', true);

  /** « Arts des jetons », « Arts par défaut » and the brush: on an editable deck. */
  readonly canChoose = computed(() => this.enabled() && this.deck.editable());

  constructor() {
    effect(() => {
      const refs = this.deckRefs();
      if (this.enabled() && this.deck.editable()) untracked(() => this.request(refs));
    });
    // The copies the deck does not pin show the player's preferences, once the deck's families are known.
    effect(() => {
      if (!this.canChoose() || !this.ready()) return;
      const choices = this.choices();
      this.deck.lines();
      this.deck.pins();
      this.deck.hero();
      untracked(() => this.deck.showPreferences(choices));
    });
  }

  /** Asks the families of `refs` not asked yet (search results, deck lines). Uniques never have alt arts. */
  request(refs: readonly string[]): void {
    if (!this.enabled()) return;
    const unasked = [...new Set(refs)].filter((r) => !this.asked.has(r));
    const uniqueRefs = unasked.filter(isUniqueReference);
    if (uniqueRefs.length) {
      uniqueRefs.forEach((r) => this.asked.add(r));
      this.known.update((m) => {
        const next = new Map(m);
        for (const r of uniqueRefs) next.set(r, null);
        return next;
      });
    }
    const missing = unasked.filter((r) => !isUniqueReference(r));
    for (let i = 0; i < missing.length; i += CHUNK) {
      const chunk = missing.slice(i, i + CHUNK);
      chunk.forEach((r) => this.asked.add(r));
      this.ownership.altArtChoices(chunk).subscribe((found) => {
        this.known.update((m) => {
          const next = new Map(m);
          for (const ref of chunk) next.set(ref, found[ref] ?? next.get(ref) ?? null);
          // Every print of a family is known with it (a print added by the brush or the search).
          for (const choice of Object.values(found)) {
            for (const o of choice.options.options) if (!next.get(o.reference)) next.set(o.reference, choice);
          }
          return next;
        });
        for (const ref of chunk) {
          const run = this.waiting.get(ref);
          this.waiting.delete(ref);
          run?.forEach((f) => f());
        }
      });
    }
  }

  /**
   * The illustration buttons (`canChoose`): `null` while the deck's owner is not known yet, so that their place is kept
   * (in skeleton) and the list under them does not move when it comes.
   */
  readonly tokensChoice = computed<boolean | null>(() => {
    if (!this.enabled() || this.deck.owned() === false) return false;
    return this.deck.owned() === null ? null : true;
  });

  /** The family of `reference` (`null`: one illustration, or not known yet). */
  choiceFor(reference: string): AltArtChoice | null {
    return this.known().get(reference) ?? null;
  }

  /** References of the deck's lines in the family of `choice`. */
  members(choice: AltArtChoice): Set<string> {
    const key = familyKey(choice.family);
    const known = this.known();
    return new Set(
      this.deck
        .lines()
        .map((l) => l.card.reference)
        .filter((r) => {
          const c = known.get(r);
          return !!c && familyKey(c.family) === key;
        }),
    );
  }

  /**
   * Copies `card` can have: a print shares its card's limit with the other prints in the deck (never under the copies
   * it has); a family card (`asFamily`, its plain print) has the whole limit.
   */
  maxFor(card: Card, asFamily: boolean): number {
    if (asFamily && this.isFamilyCard(card)) return this.deck.familyCap(card);
    return this.deck.maxFor(card);
  }

  /** Copies of `card`'s family in the deck, or of `card` alone. */
  familyQuantity(card: Card): number {
    const choice = this.choiceFor(card.reference);
    if (!choice) return this.deck.quantityOf(card.reference);
    return familyPrints(this.deck.lines(), this.members(choice)).length;
  }

  /**
   * The copies of `card`'s family in the deck, one print a copy, in the brush's order (copy 1 first); `null` when its
   * family is not known.
   */
  copyPrints(card: Card): string[] | null {
    const choice = this.choiceFor(card.reference);
    if (!choice) return null;
    return familyCopies(withRanks(choice, this.cardsFor(choice)), familyPrints(this.deck.lines(), this.members(choice)));
  }

  /** The prints this deck pins for `choice`'s family, 1st copy first. */
  private pinsFor(choice: AltArtChoice): readonly string[] {
    const ref = choice.options.options[0]?.reference;
    return ref ? this.deck.pinsOf({ reference: ref }) : [];
  }

  /** The family follows the player's preferences in this deck (no print pinned). */
  followsPreferences(choice: AltArtChoice): boolean {
    return this.pinsFor(choice).length === 0;
  }

  /**
   * The illustration of the 1st, 2nd and 3rd card of `choice`'s family in this deck: the prints the deck pins, then the
   * player's preferences.
   */
  cardsFor(choice: AltArtChoice): string[] {
    const pinned = this.pinsFor(choice);
    return rankPrints(choice).map((rank, i) => pinned[i] ?? rank);
  }

  /** Copies of `card`'s whole family (a pile of its prints): the pinned copies stay, the others take the preferences. */
  setFamilyQuantity(card: Card, quantity: number): void {
    const choice = this.choiceFor(card.reference);
    if (choice) this.deck.setFamilyQuantity(card, choice, this.members(choice), quantity);
    else this.deck.setQuantity(card, quantity);
  }

  /** `card` stands for its whole family: the plain print of a multi-art card. */
  isFamilyCard(card: Card): boolean {
    const choice = this.choiceFor(card.reference);
    return !!choice && basePrint(choice) === card.reference;
  }

  /** Copies of `card` from the search: the family's for a family card (`setFamilyQuantity`), that print otherwise. */
  setQuantity(card: Card, quantity: number): void {
    // Asked but not answered yet: the change waits for the family, so that the copy takes its preferred alt art.
    if (this.asked.has(card.reference) && !this.known().has(card.reference)) {
      this.waiting.set(card.reference, [...(this.waiting.get(card.reference) ?? []), () => this.setQuantity(card, quantity)]);
      return;
    }
    if (this.isFamilyCard(card)) this.setFamilyQuantity(card, quantity);
    else this.deck.setQuantity(card, quantity);
  }

  /** `card` has a brush: several illustrations, in an editable deck. */
  canIllustrate(card: Card): boolean {
    return this.canChoose() && (this.choiceFor(card.reference)?.options.options.length ?? 0) > 1;
  }

  /** The brush of `card` (`canIllustrate`), `null` otherwise. */
  pickerFor(card: Card): AltArtPickerData | null {
    const choice = this.choiceFor(card.reference);
    if (!choice || !this.canIllustrate(card)) return null;
    const current = () => this.choiceFor(card.reference) ?? choice;
    return {
      choice: current,
      prints: () => familyPrints(this.deck.lines(), this.members(current())),
      cards: () => this.cardsFor(current()),
      copies: () => this.copyPrints(card) ?? [],
      pinned: () => !this.followsPreferences(current()),
      setCards: (cards, scope) => this.setCards(card, cards, scope),
      reset: () => this.resetCards(card),
    };
  }

  /**
   * The 1st, 2nd and 3rd card of `card`'s family take `cards`. « Pour ce deck » (`deck`): the deck pins them for its
   * copies (saved with the deck). « Partout » (`global`): the player's preferences change on the ownership service (every
   * deck that does not pin this card), and this deck gives up its own choice for it; errors reach the caller.
   */
  setCards(card: Card, cards: readonly string[], scope: AltArtScope): Observable<void> {
    const choice = this.choiceFor(card.reference);
    if (!choice) return EMPTY;
    if (scope === 'deck') {
      const copies = familyPrints(this.deck.lines(), this.members(choice)).length;
      this.deck.pinPrints(card, choice, this.members(choice), cards.slice(0, copies));
      return of(undefined);
    }
    return this.ownership.setAltArtPreference(choice.family, [...cards]).pipe(
      tap(() => {
        this.setPreferences(choice, withRanks(choice, cards));
        this.deck.pinPrints(card, this.choiceFor(card.reference), this.members(choice), []);
      }),
      map(() => undefined),
    );
  }

  /** The family of `choice` with the player's new preferences (`next`), for every print of it. */
  private setPreferences(choice: AltArtChoice, next: AltArtChoice): void {
    const key = familyKey(choice.family);
    this.known.update((m) => {
      const out = new Map(m);
      for (const [ref, c] of m) if (c && familyKey(c.family) === key) out.set(ref, next);
      return out;
    });
  }

  /** « Utiliser mes arts par défaut » in the brush: `card`'s family follows the player's preferences again here. */
  resetCards(card: Card): void {
    const choice = this.choiceFor(card.reference);
    if (choice) this.deck.pinPrints(card, choice, this.members(choice), []);
  }

  /** « Arts par défaut », once the deck's families are known: `false` when the deck pinned no print. */
  applyDefaults(): Observable<boolean> {
    return this.ready$.pipe(map(() => this.deck.clearPins()));
  }
}

/**
 * « Arts par défaut » (deck bar, « Mon deck »): after a confirmation, the deck drops its own illustrations and follows
 * the player's preferences. Emits the message to show, `null` when cancelled.
 */
export function confirmAltArtDefaults(overlay: AcOverlayService, altArts: EditorAltArts): Observable<string | null> {
  return openConfirm(overlay, {
    title: $localize`:@@editor.altArtDefaults.title:Appliquer vos arts par défaut ?`,
    message: $localize`:@@editor.altArtDefaults.messagePins:Les illustrations choisies pour ce deck sont retirées : chaque carte, et le héros, suit vos arts alternatifs par défaut.`,
    confirmLabel: $localize`:@@editor.altArtDefaults.confirm:Appliquer`,
    icon: 'wand-sparkles',
  }).pipe(
    switchMap((ok) => (ok ? altArts.applyDefaults() : of(null))),
    map((applied) => {
      if (applied === null) return null;
      return applied
        ? $localize`:@@editor.altArtDefaults.applied:Arts par défaut appliqués.`
        : $localize`:@@editor.altArtDefaults.unchanged:Le deck a déjà vos arts par défaut.`;
    }),
  );
}
