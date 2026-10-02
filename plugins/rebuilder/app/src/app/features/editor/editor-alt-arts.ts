import { Service, computed, effect, inject, untracked } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { DeckStore } from '../../core/deck-store';
import { OwnershipApiService, familyKey, type AltArtChoice } from '../../core/ownership-api.service';

/**
 * Illustrations in the editor, as the site's deck builder: in « Global » alt-art mode the deck follows the player's
 * preferred prints; otherwise each card's print can be chosen, and a print used more times than owned is flagged
 * (Board Game Arena shows the base art for the missing copies). Needs the ownership service; nothing happens without.
 */
@Service({ autoProvided: false })
export class EditorAltArts {
  private readonly deck = inject(DeckStore);
  private readonly ownership = inject(OwnershipApiService);
  readonly global = toSignal(this.ownership.globalAltArts(), { initialValue: false });

  /** References of the deck (hero included), sorted: the families are fetched again only when they change. */
  private readonly refs = computed(
    () => {
      const refs = this.deck.lines().filter((l) => l.quantity > 0).map((l) => l.card.reference);
      const hero = this.deck.hero()?.reference;
      return [...new Set(hero ? [...refs, hero] : refs)].sort();
    },
    { equal: (a, b) => a.join() === b.join() },
  );
  private readonly choicesRes = rxResource({
    params: () => (this.ownership.baseUrl && this.deck.editable() ? this.refs() : undefined),
    stream: ({ params }) => (params.length ? this.ownership.altArtChoices(params) : of({} as Record<string, AltArtChoice>)),
  });
  readonly choices = computed<Record<string, AltArtChoice>>(() => (this.choicesRes.hasValue() ? this.choicesRes.value() : {}));

  /** Per-deck mode: why a line's print is short (owned copies under the copies of the deck), by reference. */
  readonly warnings = computed(() => {
    const out = new Map<string, string>();
    if (this.global()) return out;
    const choices = this.choices();
    for (const l of this.deck.lines()) {
      const owned = choices[l.card.reference]?.options.options.find((o) => o.reference === l.card.reference)?.ownedQuantity;
      if (owned != null && owned < l.quantity) {
        out.set(l.card.reference, $localize`:@@editor.altArt.stockWarn:Seulement ${owned}:owned: exemplaire(s) sur les ${l.quantity}:needed: utilisés dans ce deck sont possédés pour cette illustration : sur Board Game Arena, les autres auront l’illustration de base.`);
      }
    }
    return out;
  });

  constructor() {
    // Global mode: the deck takes the preferred prints once the families are known (and after each change).
    effect(() => {
      const choices = this.choices();
      if (!this.global() || !Object.keys(choices).length) return;
      const slots = new Map(
        Object.entries(choices).map(([ref, c]) => [ref, { key: familyKey(c.family), slots: [...c.options.slots].sort((a, b) => a.slotIndex - b.slotIndex).map((s) => s.reference) }]),
      );
      untracked(() => this.deck.applyAltArtSlots(slots));
    });
    // Global mode: a preference saved meanwhile (in the card zoom) is fetched again, for the deck to follow it.
    const seen = this.ownership.altArtVersion();
    effect(() => {
      if (this.ownership.altArtVersion() !== seen && untracked(this.global)) untracked(() => this.choicesRes.reload());
    });
  }

  /** « Choisir les arts des jetons »: per-deck mode with the ownership service, on an editable deck. */
  readonly canChooseTokens = computed(() => !!this.ownership.baseUrl && !this.global() && this.deck.editable());

  /** Per-deck mode: the prints a card of the deck can take (`null`: one illustration only, or Global mode). */
  choiceFor(reference: string): AltArtChoice | null {
    return this.global() ? null : this.choices()[reference] ?? null;
  }
}
