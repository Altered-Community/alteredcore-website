import { Service, computed, effect, inject, signal, untracked } from '@angular/core';
import { EMPTY, type Observable, catchError, filter, map, of, switchMap, take, throwError } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { AuthSession } from '../../core/auth-session';
import { basePrint, defaultPrints, familyPrints, slotChoices, slotDefaults, withRanks } from '../../core/alt-art-defaults';
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
 * art for its copy, the brush of a card sets its default alt arts (this deck's copies take them), « Appliquer les arts
 * par défaut » rewrites the deck with the defaults, and a print used more times than owned is flagged (Board Game Arena
 * shows the base art for the missing copies). Needs the ownership service and a signed-in player; nothing happens without.
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

  constructor() {
    effect(() => {
      const refs = this.deckRefs();
      if (this.enabled() && this.deck.editable()) untracked(() => this.request(refs));
    });
    // A deck of a player switched from the « Global » mode takes their default alt arts the first time it opens here.
    const checked = new Set<string>();
    effect(() => {
      const id = this.deck.deckId();
      if (!id || !this.enabled() || this.deck.isGuest() || this.deck.editable() !== true || checked.has(id)) return;
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
          // A family already known keeps its choice: its defaults may have been saved by the brush since this request left.
          const families = new Map<string, AltArtChoice>();
          for (const c of m.values()) if (c) families.set(familyKey(c.family), c);
          const current = (choice: AltArtChoice) => families.get(familyKey(choice.family)) ?? choice;
          for (const ref of chunk) {
            const choice = found[ref];
            next.set(ref, choice ? current(choice) : (next.get(ref) ?? null));
          }
          // Every print of a family is known with it (a print added by the brush or the search).
          for (const choice of Object.values(found)) {
            for (const o of choice.options.options) if (!next.get(o.reference)) next.set(o.reference, current(choice));
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
    if (!choice || (asFamily && basePrint(choice) === card.reference)) return max;
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
    return slotDefaults(choice, slotChoices(choice, familyPrints(this.deck.lines(), this.members(choice))));
  }

  /** Copies of `card`'s whole family (a pile of its prints): an added copy takes its default alt art. */
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

  /** Copies of `card` from the search: by the defaults for a family card (`setFamilyQuantity`), that print otherwise. */
  setQuantity(card: Card, quantity: number): void {
    // Asked but not answered yet: the change waits for the family, so that the copy takes its default alt art.
    if (this.asked.has(card.reference) && !this.known().has(card.reference)) {
      this.waiting.set(card.reference, [...(this.waiting.get(card.reference) ?? []), () => this.setQuantity(card, quantity)]);
      return;
    }
    const choice = this.choiceFor(card.reference);
    if (choice && basePrint(choice) === card.reference) this.deck.setFamilyQuantity(card, choice, this.members(choice), quantity);
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
      set: (prints) => this.deck.setFamilyPrints(this.members(choice), card, prints),
      setDefaults: (ranks) => this.setDefaults(card, ranks),
    };
  }

  /**
   * The default alt arts of `card`'s family become `ranks` (1st choice first): this deck's copies of the family take them
   * at once, then the ownership service saves them; on an error, the previous defaults and copies come back.
   */
  setDefaults(card: Card, ranks: readonly string[]): Observable<void> {
    const choice = this.choiceFor(card.reference);
    if (!choice) return EMPTY;
    const before = familyPrints(this.deck.lines(), this.members(choice));
    const next = withRanks(choice, ranks);
    this.replaceChoice(next);
    this.deck.setFamilyPrints(this.members(choice), card, defaultPrints(next, before.length));
    return this.ownership.setAltArtPreference(choice.family, [...ranks]).pipe(
      catchError((err: unknown) => {
        this.replaceChoice(choice);
        this.deck.setFamilyPrints(this.members(choice), card, before);
        return throwError(() => err);
      }),
    );
  }

  /** Every print of `choice`'s family is known with `choice`. */
  private replaceChoice(choice: AltArtChoice): void {
    const key = familyKey(choice.family);
    this.known.update((m) => new Map([...m].map(([ref, c]) => [ref, c && familyKey(c.family) === key ? choice : c])));
  }

  /** « Appliquer les arts par défaut », once the deck's families are known: `false` when the deck already has them. */
  applyDefaults(): Observable<boolean> {
    return this.ready$.pipe(map(() => this.deck.applyAltArtDefaults(this.choices())));
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

