import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject, of, throwError } from 'rxjs';
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
  let saved: string[][];
  let saveFails: boolean;

  function setup(): EditorAltArts {
    answers = new Subject();
    lines = signal<HydratedLine[]>([]);
    familyAdds = [];
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
            setAltArtPreference: (_family: unknown, slots: string[]) => (saveFails ? throwError(() => new Error('down')) : (saved.push(slots), of(undefined))),
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
            setFamilyQuantity: (_card: Card, _choice: AltArtChoice, _members: Set<string>, n: number) => familyAdds.push(n),
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

  it('saves the brush’s choices as the default alt arts, the deck’s copies taking them', () => {
    const alt = setup();
    alt.request([BASE]);
    answers.next({ [BASE]: kelon });
    lines.set([{ card: card(BASE), quantity: 2 }]);
    alt.setDefaults(card(BASE), [ALT, BASE, ALT]).subscribe();
    expect(saved).toEqual([[ALT, BASE, ALT]]);
    expect(lines().map((l) => [l.card.reference, l.quantity])).toEqual([[ALT, 1], [BASE, 1]]);
    expect(alt.pickerFor(card(BASE))!.choice().options.slots.map((s) => s.reference)).toEqual([ALT, BASE, ALT]);
  });

  it('puts the defaults and the copies back when the choices cannot be saved', () => {
    const alt = setup();
    alt.request([BASE]);
    answers.next({ [BASE]: kelon });
    lines.set([{ card: card(BASE), quantity: 2 }]);
    saveFails = true;
    let failed = false;
    alt.setDefaults(card(BASE), [BASE, BASE, BASE]).subscribe({ error: () => (failed = true) });
    expect(failed).toBe(true);
    expect(lines().map((l) => [l.card.reference, l.quantity])).toEqual([[BASE, 2]]);
    expect(alt.choiceFor(BASE)).toBe(kelon);
  });
});
