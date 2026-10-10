import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject, of, throwError } from 'rxjs';
import { DeckAltArtsApiService } from '../../core/deck-alt-arts-api.service';
import { AuthSession } from '../../core/auth-session';
import { DeckStore } from '../../core/deck-store';
import type { Card, HydratedLine } from '../../core/models';
import { OwnershipApiService, type AltArtChoice } from '../../core/ownership-api.service';
import { EditorAltArts } from './editor-alt-arts';

const BASE = 'ALT_CORE_B_AX_04_C';
const ALT = 'ALT_DUSTERTOP_P_AX_04_C';
const NONE = 'ALT_CORE_A_AX_04_C';
const kelon: AltArtChoice = {
  family: { familyId: 302, faction: 'AX', rarity: 'C' },
  options: {
    options: [
      { reference: BASE, ownedQuantity: null },
      { reference: ALT, ownedQuantity: 2 },
      { reference: NONE, ownedQuantity: 0 },
    ],
    slots: [1, 2, 3].map((slotIndex) => ({ slotIndex, reference: ALT })),
  },
};
const card = (reference: string): Card => ({ reference, name: 'Élémentaire de Kélon' });

describe('EditorAltArts', () => {
  let answers: Subject<Record<string, AltArtChoice>>;
  let lines: ReturnType<typeof signal<HydratedLine[]>>;
  let familyAdds: number[];
  let familyChoices: AltArtChoice[];
  let saved: [string, string, readonly string[] | null][];
  let saveFails: boolean;
  let loaded: Record<string, string[]>;

  function setup(cards: Record<string, string[]> = {}): EditorAltArts {
    loaded = cards;
    answers = new Subject();
    lines = signal<HydratedLine[]>([]);
    familyAdds = [];
    familyChoices = [];
    saved = [];
    saveFails = false;
    TestBed.configureTestingModule({
      providers: [
        EditorAltArts,
        { provide: AuthSession, useValue: { isLoggedIn: () => true } },
        {
          provide: OwnershipApiService,
          useValue: {
            baseUrl: '/ownership',
            altArtChoices: () => answers,
            pendingDefaults: () => of(false),
          },
        },
        {
          provide: DeckAltArtsApiService,
          useValue: {
            load: () => of(loaded),
            save: (deck: string, family: string, cards: readonly string[] | null) =>
              saveFails ? throwError(() => new Error('down')) : (saved.push([deck, family, cards]), of(undefined)),
            clear: () => of(undefined),
          },
        },
        {
          provide: DeckStore,
          useValue: {
            lines,
            hero: signal(null),
            editable: signal(true),
            deckId: signal('d1'),
            isGuest: signal(false),
            maxFor: () => 3,
            quantityOf: (ref: string) => lines().find((l) => l.card.reference === ref)?.quantity ?? 0,
            setQuantity: () => undefined,
            setFamilyQuantity: (_card: Card, choice: AltArtChoice, _members: Set<string>, n: number) => (familyAdds.push(n), familyChoices.push(choice)),
            setFamilyPrints: (_members: Set<string>, _card: Card, prints: string[]) =>
              lines.set([...new Set(prints)].map((reference) => ({ card: card(reference), quantity: prints.filter((p) => p === reference).length }))),
          },
        },
      ],
    });
    return TestBed.inject(EditorAltArts);
  }

  it('waits for a card’s family before adding a copy, so that it takes its default alt art', () => {
    const alt = setup();
    alt.request([BASE]);
    alt.setQuantity(card(BASE), 1);
    expect(familyAdds).toEqual([]);
    answers.next({ [BASE]: kelon });
    expect(familyAdds).toEqual([1]);
  });

  it('gives a print the copies its family leaves, and a family card the whole limit', () => {
    const alt = setup();
    alt.request([BASE]);
    answers.next({ [BASE]: kelon });
    lines.set([
      { card: card(BASE), quantity: 2 },
      { card: card(ALT), quantity: 1 },
    ]);
    expect(alt.maxFor(card(ALT), false)).toBe(1);
    expect(alt.maxFor(card(BASE), false)).toBe(2);
    expect(alt.maxFor(card(BASE), true)).toBe(3);
    expect(alt.familyQuantity(card(BASE))).toBe(3);
  });

  const KEY = '302:AX:C';
  const slotsOf = (choice: AltArtChoice) => choice.options.slots.map((slot) => slot.reference);

  it('keeps the brush’s cards for the deck, its copies taking them, and an added copy takes the next card’s', () => {
    const alt = setup();
    alt.request([BASE]);
    answers.next({ [BASE]: kelon });
    lines.set([{ card: card(BASE), quantity: 2 }]);
    alt.setCards(card(BASE), [ALT, BASE, BASE]).subscribe();
    expect(saved).toEqual([['d1', KEY, [ALT, BASE, BASE]]]);
    expect(lines().map((l) => [l.card.reference, l.quantity])).toEqual([[ALT, 1], [BASE, 1]]);
    expect(alt.cardsFor(kelon)).toEqual([ALT, BASE, BASE]);
    // The default alt arts (ALT on every slot) do not change; the 3rd copy takes the deck's 3rd card.
    expect(slotsOf(kelon)).toEqual([ALT, ALT, ALT]);
    alt.setFamilyQuantity(card(BASE), 3);
    expect(slotsOf(familyChoices[0])).toEqual([ALT, BASE, BASE]);
  });

  it('reads the deck’s cards, and leaves them while the deck’s copies do not match them', () => {
    const alt = setup({ [KEY]: [BASE, ALT, BASE] });
    alt.request([BASE]);
    answers.next({ [BASE]: kelon });
    lines.set([
      { card: card(BASE), quantity: 1 },
      { card: card(ALT), quantity: 1 },
    ]);
    TestBed.tick();
    expect(alt.cardsFor(kelon)).toEqual([BASE, ALT, BASE]);
    // Copies changed elsewhere: the cards come from the copies, then the defaults.
    lines.set([{ card: card(BASE), quantity: 2 }]);
    expect(alt.cardsFor(kelon)).toEqual([BASE, BASE, ALT]);
  });

  it('puts the deck’s previous cards back when the choice cannot be saved', () => {
    const alt = setup();
    alt.request([BASE]);
    answers.next({ [BASE]: kelon });
    lines.set([{ card: card(BASE), quantity: 2 }]);
    saveFails = true;
    let failed = false;
    alt.setCards(card(BASE), [BASE, BASE, BASE]).subscribe({ error: () => (failed = true) });
    expect(failed).toBe(true);
    expect(alt.cardsFor(kelon)).toEqual([BASE, BASE, ALT]);
  });
});
