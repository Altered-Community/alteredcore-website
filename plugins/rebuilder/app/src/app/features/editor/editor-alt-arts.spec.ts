import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject, of, throwError } from 'rxjs';
import { AuthSession } from '../../core/auth-session';
import { DeckStore } from '../../core/deck-store';
import { printKey } from '../../core/deck-prints';
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
  let pins: ReturnType<typeof signal<ReadonlyMap<string, readonly string[]>>>;
  let familyAdds: number[];
  let pinned: (readonly string[])[];
  let shown: Record<string, AltArtChoice>[];
  let preferences: [AltArtChoice['family'], string[]][];
  let preferenceFails: boolean;
  let cleared: number;

  function setup(): EditorAltArts {
    answers = new Subject();
    lines = signal<HydratedLine[]>([]);
    pins = signal<ReadonlyMap<string, readonly string[]>>(new Map());
    familyAdds = [];
    pinned = [];
    shown = [];
    preferences = [];
    preferenceFails = false;
    cleared = 0;
    TestBed.configureTestingModule({
      providers: [
        EditorAltArts,
        { provide: AuthSession, useValue: { isLoggedIn: () => true } },
        {
          provide: OwnershipApiService,
          useValue: {
            baseUrl: '/ownership',
            altArtChoices: () => answers,
            setAltArtPreference: (family: AltArtChoice['family'], refs: string[]) =>
              preferenceFails ? throwError(() => new Error('down')) : (preferences.push([family, refs]), of(undefined)),
          },
        },
        {
          provide: DeckStore,
          useValue: {
            lines,
            pins,
            hero: signal(null),
            editable: signal(true),
            owned: signal(true),
            familyCap: () => 3,
            maxFor: () => 1,
            quantityOf: (ref: string) => lines().find((l) => l.card.reference === ref)?.quantity ?? 0,
            pinsOf: (c: Pick<Card, 'reference'>) => pins().get(printKey(c.reference)) ?? [],
            setQuantity: () => undefined,
            setFamilyQuantity: (_card: Card, _choice: AltArtChoice, _members: Set<string>, n: number) => familyAdds.push(n),
            pinPrints: (c: Card, _choice: AltArtChoice | null, _members: Set<string>, prints: readonly string[]) => {
              pinned.push(prints);
              pins.set(prints.length ? new Map([[printKey(c.reference), prints]]) : new Map());
            },
            showPreferences: (choices: Record<string, AltArtChoice>) => shown.push(choices),
            clearPins: () => (cleared++, true),
          },
        },
      ],
    });
    return TestBed.inject(EditorAltArts);
  }

  function ready(alt: EditorAltArts, copies = 2): void {
    alt.request([BASE]);
    answers.next({ [BASE]: kelon });
    lines.set([{ card: card(BASE), quantity: copies }]);
  }

  it('waits for a card’s family before adding a copy, so that it takes its preferred alt art', () => {
    const alt = setup();
    alt.request([BASE]);
    alt.setQuantity(card(BASE), 1);
    expect(familyAdds).toEqual([]);
    answers.next({ [BASE]: kelon });
    expect(familyAdds).toEqual([1]);
  });

  it('gives a family card the whole limit of its card, and a print what its card leaves', () => {
    const alt = setup();
    ready(alt);
    expect(alt.maxFor(card(BASE), true)).toBe(3);
    expect(alt.maxFor(card(ALT), false)).toBe(1);
    expect(alt.familyQuantity(card(BASE))).toBe(2);
  });

  it('shows the player’s preferences for the copies the deck does not pin, once the families are known', () => {
    const alt = setup();
    ready(alt);
    TestBed.tick();
    expect(shown.at(-1)).toEqual({ [BASE]: kelon });
  });

  it('« Pour ce deck »: pins the brush’s cards for the deck’s copies, the preferences unchanged', () => {
    const alt = setup();
    ready(alt);
    expect(alt.cardsFor(kelon)).toEqual([ALT, ALT, ALT]);
    alt.setCards(card(BASE), [BASE, NONE, ALT], 'deck').subscribe();
    expect(pinned).toEqual([[BASE, NONE]]);
    expect(preferences).toEqual([]);
    expect(alt.cardsFor(kelon)).toEqual([BASE, NONE, ALT]);
    expect(alt.followsPreferences(kelon)).toBe(false);
  });

  it('« Pour ce deck »: forces the base art over a player’s default alt art (a pin on the canonical print)', () => {
    const alt = setup();
    ready(alt);
    alt.setCards(card(BASE), [BASE, BASE, BASE], 'deck').subscribe();
    expect(pinned).toEqual([[BASE, BASE]]);
    expect(alt.followsPreferences(kelon)).toBe(false);
    expect(alt.cardsFor(kelon)).toEqual([BASE, BASE, ALT]);
    alt.resetCards(card(BASE));
    expect(pinned.at(-1)).toEqual([]);
    expect(alt.followsPreferences(kelon)).toBe(true);
  });

  it('« Partout »: saves the player’s preferences and drops the deck’s own choice for the card', () => {
    const alt = setup();
    ready(alt);
    alt.setCards(card(BASE), [NONE], 'deck').subscribe();
    alt.setCards(card(BASE), [BASE, BASE, ALT], 'global').subscribe();
    expect(preferences).toEqual([[kelon.family, [BASE, BASE, ALT]]]);
    expect(pinned.at(-1)).toEqual([]);
    expect(alt.followsPreferences(kelon)).toBe(true);
    // Every print of the family has the new preferences.
    expect(alt.cardsFor(alt.choiceFor(ALT)!)).toEqual([BASE, BASE, ALT]);
  });

  it('« Partout » refused: the error reaches the brush, nothing changes', () => {
    const alt = setup();
    ready(alt);
    preferenceFails = true;
    let failed = false;
    alt.setCards(card(BASE), [BASE, BASE, BASE], 'global').subscribe({ error: () => (failed = true) });
    expect(failed).toBe(true);
    expect(alt.cardsFor(kelon)).toEqual([ALT, ALT, ALT]);
    expect(pinned).toEqual([]);
  });

  it('« Utiliser mes arts par défaut » unpins the card; « Arts par défaut » unpins the whole deck', () => {
    const alt = setup();
    ready(alt);
    alt.setCards(card(BASE), [NONE], 'deck').subscribe();
    alt.resetCards(card(BASE));
    expect(pinned.at(-1)).toEqual([]);
    TestBed.tick();
    let applied: boolean | undefined;
    alt.applyDefaults().subscribe((a) => (applied = a));
    expect(applied).toBe(true);
    expect(cleared).toBe(1);
  });

  it('gives a brush to a card with several illustrations of an editable deck', () => {
    const alt = setup();
    ready(alt);
    expect(alt.canIllustrate(card(BASE))).toBe(true);
    expect(alt.pickerFor(card(BASE))?.pinned()).toBe(false);
  });

  it('does not query alt-art families for Unique references', () => {
    const alt = setup();
    const ownership = TestBed.inject(OwnershipApiService);
    const spy = vi.spyOn(ownership, 'altArtChoices');
    const uniqueRef = 'ALT_CORE_B_AX_04_U_1';
    alt.request([uniqueRef, BASE]);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith([BASE]);
    answers.next({ [BASE]: kelon });
    expect(alt.canIllustrate(card(uniqueRef))).toBe(false);
  });
});
