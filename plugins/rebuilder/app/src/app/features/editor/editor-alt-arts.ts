import { Service, computed, effect, inject, signal, untracked } from '@angular/core';
import { EMPTY, type Observable, catchError, filter, map, of, switchMap, take, tap, throwError } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { AuthSession } from '../../core/auth-session';
import { basePrint, defaultPrints, familyCopies, familyPrints, rankPrints, sameCopies, withRanks } from '../../core/alt-art-defaults';
import { DeckAltArtsApiService } from '../../core/deck-alt-arts-api.service';
import { DeckStore } from '../../core/deck-store';
import { storedFlag } from '../../core/stored-flag';
import type { Card } from '../../core/models';
import { OwnershipApiService, familyKey, type AltArtChoice } from '../../core/ownership-api.service';
import type { AltArtPickerData } from './alt-art-picker/alt-art-picker.overlay';
import { openConfirm } from '../shared/confirm/confirm.overlay';
import type { AcOverlayService } from '../../ui/overlay';

/** References asked to the site at once (`deck-alt-arts`, a GET with one parameter a reference). */
const CHUNK = 60;

/**
 * Illustrations in the editor (`core/alt-art-defaults.ts`): a card added from the search takes the player's default alt
 * art for its copy, the brush of a card chooses the illustration of its 1st, 2nd and 3rd card in this deck (kept by
 * `DeckAltArtsApiService`; an added copy takes the next card's), « Appliquer les arts par défaut » rewrites the deck
 * with the defaults, and a print used more times than owned is flagged (Board Game Arena shows the base art for the
 * missing copies). Needs the ownership service and a signed-in player; nothing happens without.
 */
@Service({ autoProvided: false })
export class EditorAltArts {
  private readonly deck = inject(DeckStore);
  private readonly ownership = inject(OwnershipApiService);
  private readonly auth = inject(AuthSession);
  private readonly deckAltArts = inject(DeckAltArtsApiService);
  readonly enabled = computed(() => !!this.ownership.baseUrl && this.auth.isLoggedIn());

  /** Family of each reference asked so far (`null`: one illustration only); the prints of a family share it. */
  private readonly known = signal<ReadonlyMap<string, AltArtChoice | null>>(new Map());
  private readonly asked = new Set<string>();
  /** The brush's choices for this deck (1st, 2nd, 3rd card), by family key. */
  private readonly deckCards = signal<ReadonlyMap<string, readonly string[]>>(new Map());
  /** Changes waiting for the family of their reference (a card added before its family arrived). */
  private readonly waiting = new Map<string, (() => void)[]>();

  /** References of the deck (hero included). */
  private readonly deckRefs = computed(() => {
    const refs = this.deck.lines().filter((l) => l.quantity > 0).map((l) => l.card.reference);
    const hero = this.deck.hero()?.reference;
    return hero ? [...refs, hero] : refs;
  });
  /** Families of the deck's references, by reference. */
  readonly choices = computed<Record<string, AltArtChoice>>(() => {
    const known = this.known();
    const out: Record<string, AltArtChoice> = {};
    for (const ref of this.deckRefs()) {
      const choice = known.get(ref);
      if (choice) out[ref] = choice;
    }
    return out;
  });
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

  /** « Arts des jetons » and « Arts par défaut »: on an editable deck. */
  readonly canChoose = computed(() => this.enabled() && this.deck.editable());
  /** The deck's id when the player's choices for it are kept on the site: a saved deck of theirs; `null` otherwise. */
  private readonly ownDeckId = computed(() => {
    const id = this.deck.deckId();
    return id && this.enabled() && !this.deck.isGuest() && this.deck.editable() === true ? id : null;
  });

  constructor() {
    effect(() => {
      const refs = this.deckRefs();
      if (this.enabled() && this.deck.editable()) untracked(() => this.request(refs));
    });
    // The brush's choices for the deck. A new deck gets an id on its first save: the choices made before are sent then.
    let cardsOf: string | null = null;
    effect(() => {
      const id = this.ownDeckId();
      if (!id || id === cardsOf) return;
      const previous = cardsOf;
      cardsOf = id;
      untracked(() => {
        if (previous === null && this.deckCards().size) {
          for (const [key, cards] of this.deckCards()) this.deckAltArts.save(id, key, cards).subscribe({ error: () => undefined });
          return;
        }
        this.deckCards.set(new Map());
        this.deckAltArts.load(id).subscribe((families) => {
          if (this.deck.deckId() === id) this.deckCards.set(new Map(Object.entries(families)));
        });
      });
    });
    // A deck of a player switched from the « Global » mode takes their default alt arts the first time it opens here.
    const checked = new Set<string>();
    effect(() => {
      const id = this.ownDeckId();
      if (!id || checked.has(id)) return;
      checked.add(id);
      untracked(() =>
        this.ownership
          .pendingDefaults(id)
          .pipe(
            filter(Boolean),
            switchMap(() => this.ready$),
            filter(() => this.deck.deckId() === id),
          )
          .subscribe(() => {
            this.deck.applyAltArtDefaults(this.choices());
            this.clearCards();
            this.ownership.clearPendingDefaults(id).subscribe();
          }),
      );
    });
  }

  /** Asks the families of `refs` not asked yet (search results, deck lines). */
  request(refs: readonly string[]): void {
    if (!this.enabled()) return;
    const missing = [...new Set(refs)].filter((r) => !this.asked.has(r));
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
   * Copies `card` can have: a print shares its family's limit with the other prints in the deck (never under the copies
   * it has); a family card (`asFamily`, its plain print) has the whole limit.
   */
  maxFor(card: Card, asFamily: boolean): number {
    const max = this.deck.maxFor(card);
    const choice = this.choiceFor(card.reference);
    if (!choice || (asFamily && this.isFamilyCard(card))) return max;
    const others = familyPrints(this.deck.lines(), this.members(choice)).filter((r) => r !== card.reference).length;
    return Math.max(this.deck.quantityOf(card.reference), max - others);
  }

  /** Copies of `card`'s family in the deck, or of `card` alone. */
  familyQuantity(card: Card): number {
    const choice = this.choiceFor(card.reference);
    if (!choice) return this.deck.quantityOf(card.reference);
    return familyPrints(this.deck.lines(), this.members(choice)).length;
  }

  /**
   * The copies of `card`'s family in the deck, one print a copy, in the brush's order (copy 1 first: the copies on
   * their default alt art on their slot); `null` when its family is not known.
   */
  copyPrints(card: Card): string[] | null {
    const choice = this.choiceFor(card.reference);
    if (!choice) return null;
    return familyCopies(this.deckChoice(choice), familyPrints(this.deck.lines(), this.members(choice)));
  }

  /**
   * The illustration of the 1st, 2nd and 3rd card of `choice`'s family in this deck: the brush's choices while the
   * deck's copies match them, else its copies (in the brush's order) and the default alt arts for the cards past them.
   */
  cardsFor(choice: AltArtChoice): string[] {
    const prints = familyPrints(this.deck.lines(), this.members(choice));
    const saved = this.deckCards().get(familyKey(choice.family));
    if (saved && sameCopies(prints, defaultPrints(withRanks(choice, saved), prints.length))) return [...saved];
    const copies = familyCopies(choice, prints);
    return rankPrints(choice).map((rank, i) => copies[i] ?? rank);
  }

  /** `choice` with this deck's cards as its slots: what an added copy of the family takes, and the copies' order. */
  private deckChoice(choice: AltArtChoice): AltArtChoice {
    return withRanks(choice, this.cardsFor(choice));
  }

  /** Copies of `card`'s whole family (a pile of its prints): an added copy takes the illustration of its card. */
  setFamilyQuantity(card: Card, quantity: number): void {
    const choice = this.choiceFor(card.reference);
    if (choice) this.deck.setFamilyQuantity(card, this.deckChoice(choice), this.members(choice), quantity);
    else this.deck.setQuantity(card, quantity);
  }

  /** `card` stands for its whole family: the plain print of a multi-art card. */
  isFamilyCard(card: Card): boolean {
    const choice = this.choiceFor(card.reference);
    return !!choice && basePrint(choice) === card.reference;
  }

  /** Copies of `card` from the search: by the defaults for a family card (`setFamilyQuantity`), that print otherwise. */
  setQuantity(card: Card, quantity: number): void {
    // Asked but not answered yet: the change waits for the family, so that the copy takes its default alt art.
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
    return {
      choice: () => this.choiceFor(card.reference) ?? choice,
      prints: () => familyPrints(this.deck.lines(), this.members(choice)),
      cards: () => this.cardsFor(this.choiceFor(card.reference) ?? choice),
      copies: () => this.copyPrints(card) ?? [],
      setCards: (cards) => this.setCards(card, cards),
      reset: () => this.resetCards(card),
    };
  }

  /**
   * The 1st, 2nd and 3rd card of `card`'s family take `cards` in this deck: its copies take them at once, then the choice
   * is saved for the deck (the default alt arts do not change; three plain prints are no choice to keep); on an error,
   * the previous choice and copies come back.
   */
  setCards(card: Card, cards: readonly string[]): Observable<void> {
    const choice = this.choiceFor(card.reference);
    if (!choice) return EMPTY;
    const key = familyKey(choice.family);
    const members = this.members(choice);
    const before = this.deckCards().get(key);
    const beforePrints = familyPrints(this.deck.lines(), members);
    this.keepCards(key, [...cards]);
    this.deck.setFamilyPrints(members, card, defaultPrints(withRanks(choice, cards), beforePrints.length));
    const id = this.ownDeckId();
    if (!id) return of(undefined);
    const base = basePrint(choice);
    return this.deckAltArts.save(id, key, cards.every((c) => c === base) ? null : cards).pipe(
      catchError((err: unknown) => {
        this.keepCards(key, before);
        this.deck.setFamilyPrints(this.members(choice), card, beforePrints);
        return throwError(() => err);
      }),
    );
  }

  /** « Arts par défaut » in the brush: `card`'s family follows the default alt arts again in this deck. */
  resetCards(card: Card): void {
    const choice = this.choiceFor(card.reference);
    if (!choice) return;
    const key = familyKey(choice.family);
    const members = this.members(choice);
    this.deck.setFamilyPrints(members, card, defaultPrints(choice, familyPrints(this.deck.lines(), members).length));
    if (!this.deckCards().has(key)) return;
    this.keepCards(key, undefined);
    const id = this.ownDeckId();
    if (id) this.deckAltArts.save(id, key, null).subscribe({ error: () => undefined });
  }

  /** The brush's choices for family `key` in this deck (`undefined`: none, it follows the default alt arts). */
  private keepCards(key: string, cards: readonly string[] | undefined): void {
    this.deckCards.update((m) => {
      const next = new Map(m);
      if (cards) next.set(key, cards);
      else next.delete(key);
      return next;
    });
  }

  /** The whole deck follows the default alt arts again: the brush's choices for it are dropped. */
  private clearCards(): void {
    this.deckCards.set(new Map());
    const id = this.ownDeckId();
    if (id) this.deckAltArts.clear(id).subscribe();
  }

  /** « Appliquer les arts par défaut », once the deck's families are known: `false` when the deck already has them. */
  applyDefaults(): Observable<boolean> {
    return this.ready$.pipe(
      map(() => this.deck.applyAltArtDefaults(this.choices())),
      tap(() => this.clearCards()),
    );
  }
}

/**
 * « Arts par défaut » (deck bar, « Mon deck »): after a confirmation, the deck takes the player's default alt arts.
 * Emits the message to show, `null` when cancelled.
 */
export function confirmAltArtDefaults(overlay: AcOverlayService, altArts: EditorAltArts): Observable<string | null> {
  return openConfirm(overlay, {
    title: $localize`:@@editor.altArtDefaults.title:Appliquer vos arts par défaut ?`,
    message: $localize`:@@editor.altArtDefaults.message:Chaque carte du deck, et le héros, prend vos arts alternatifs par défaut. Les illustrations choisies pour ce deck sont remplacées.`,
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

