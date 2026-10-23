import { addedCopyPrint, canRank, defaultPrints, familyPrints, linesWithDefaults, rankPrints, removedCopyPrint, sameCopies, slotChoices, slotDefaults, withFamilyPrints, withRanks } from './alt-art-defaults';
import type { HydratedLine } from './models';
import type { AltArtChoice } from './ownership-api.service';

const BASE = 'ALT_CORE_B_AX_09_C';
const MUSUBI = 'ALT_MUSUBI_B_AX_09_C';
const ALT = 'ALT_CORE_A_AX_09_C';

/** Fée Clochette: the plain print, an unlimited MUSUBI print, an alt art owned `owned` times; `slots` are the defaults. */
function fee(slots: string[], owned = 2): AltArtChoice {
  return {
    family: { familyId: 304, faction: 'AX', rarity: 'C' },
    options: {
      options: [
        { reference: BASE, ownedQuantity: null },
        { reference: MUSUBI, ownedQuantity: null },
        { reference: ALT, ownedQuantity: owned },
      ],
      slots: slots.map((reference, i) => ({ slotIndex: i + 1, reference, isExplicitChoice: reference !== BASE })),
    },
  };
}

const line = (reference: string, quantity: number): HydratedLine => ({ card: { reference, name: 'Fée Clochette' }, quantity });

describe('defaultPrints', () => {
  it('gives copy i the default of slot i, the copies past the last slot the last one', () => {
    expect(defaultPrints(fee([MUSUBI, ALT, BASE]), 3)).toEqual([MUSUBI, ALT, BASE]);
    expect(defaultPrints(fee([MUSUBI]), 3)).toEqual([MUSUBI, MUSUBI, MUSUBI]);
  });

  it('falls back to the plain print once the owned copies are used', () => {
    expect(defaultPrints(fee([ALT, ALT, ALT], 2), 3)).toEqual([ALT, ALT, BASE]);
    expect(defaultPrints(fee([ALT, ALT, ALT], 0), 2)).toEqual([BASE, BASE]);
  });

  it('sorts the slots by their index (the service counts from 1, the mock from 0)', () => {
    const choice = fee([]);
    choice.options.slots = [
      { slotIndex: 2, reference: ALT },
      { slotIndex: 1, reference: MUSUBI },
    ];
    expect(defaultPrints(choice, 2)).toEqual([MUSUBI, ALT]);
  });
});

describe('choices (brush)', () => {
  it('gives three choices from the slots, the last one repeated, the plain print without any', () => {
    expect(rankPrints(fee([MUSUBI, ALT, BASE]))).toEqual([MUSUBI, ALT, BASE]);
    expect(rankPrints(fee([ALT]))).toEqual([ALT, ALT, ALT]);
    expect(rankPrints(fee([]))).toEqual([BASE, BASE, BASE]);
  });

  it('turns the choices into the slots of the defaults', () => {
    const choice = withRanks(fee([]), [ALT, MUSUBI, ALT]);
    expect(rankPrints(choice)).toEqual([ALT, MUSUBI, ALT]);
    expect(defaultPrints(choice, 2)).toEqual([ALT, MUSUBI]);
  });

  it('lets a choice take an alt art while the other choices hold fewer than the copies owned', () => {
    const choice = fee([ALT, BASE, BASE], 1);
    expect(canRank(choice, rankPrints(choice), 1, ALT)).toBe(false);
    expect(canRank(choice, rankPrints(choice), 0, ALT)).toBe(true);
    expect(canRank(choice, rankPrints(choice), 1, MUSUBI)).toBe(true);
    expect(canRank(fee([], 0), [BASE, BASE, BASE], 0, ALT)).toBe(false);
  });
});

describe('slotDefaults', () => {
  it('gives a free copy its slot’s default, the copies chosen in the deck taking the owned copies first', () => {
    expect(slotDefaults(fee([ALT, ALT, MUSUBI], 2), [null, null, null])).toEqual([ALT, ALT, MUSUBI]);
    expect(slotDefaults(fee([ALT, ALT, MUSUBI], 2), [BASE, null, null])).toEqual([BASE, ALT, MUSUBI]);
    expect(slotDefaults(fee([ALT, ALT, ALT], 2), [null, ALT, null])).toEqual([ALT, ALT, BASE]);
    expect(slotDefaults(fee([ALT, ALT, ALT], 1), [null, null, ALT])).toEqual([BASE, BASE, ALT]);
  });
});

describe('slotChoices', () => {
  const back = (choice: AltArtChoice, prints: string[]) => slotDefaults(choice, slotChoices(choice, prints));

  it('leaves free the copies on their default, the other prints chosen and first', () => {
    expect(slotChoices(fee([ALT, ALT, MUSUBI]), [ALT, ALT, MUSUBI])).toEqual([null, null, null]);
    expect(slotChoices(fee([ALT, ALT, MUSUBI]), [MUSUBI, ALT, BASE])).toEqual([BASE, null, null]);
    expect(slotChoices(fee([BASE, BASE, BASE]), [BASE, ALT, BASE])).toEqual([ALT, null, null]);
    expect(slotChoices(fee([ALT, MUSUBI, MUSUBI]), [BASE, BASE, BASE])).toEqual([BASE, BASE, BASE]);
  });

  it('gives back the deck’s copies, an owned print taken by a chosen copy included', () => {
    const choice = fee([ALT, ALT, ALT], 1);
    expect(slotChoices(choice, [BASE, BASE, BASE])).toEqual([BASE, BASE, BASE]);
    for (const prints of [[BASE, BASE, BASE], [ALT, BASE, BASE], [MUSUBI, BASE, ALT], [MUSUBI, MUSUBI, MUSUBI], [ALT, ALT, BASE]]) {
      expect(sameCopies(back(choice, prints), prints)).toBe(true);
    }
  });
});

describe('addedCopyPrint', () => {
  it('gives an added copy the next default the copies lack', () => {
    const choice = fee([MUSUBI, ALT, BASE]);
    expect(addedCopyPrint(choice, [])).toBe(MUSUBI);
    expect(addedCopyPrint(choice, [MUSUBI])).toBe(ALT);
    expect(addedCopyPrint(choice, [MUSUBI, ALT])).toBe(BASE);
  });

  it('keeps a print chosen in the deck: the next copy takes the first default not used yet', () => {
    // The deck put its 1st copy on the alt art: the next copy takes the MUSUBI print of the 1st default.
    expect(addedCopyPrint(fee([MUSUBI, ALT, BASE]), [ALT])).toBe(MUSUBI);
  });

  it('never gives more copies of a print than owned', () => {
    // 2 alt arts owned, both in the deck already: the 3rd default (the alt art) falls back to the plain print.
    expect(addedCopyPrint(fee([ALT, ALT, ALT], 2), [ALT, ALT])).toBe(BASE);
  });
});

describe('removedCopyPrint', () => {
  it('removes the last copy by the defaults, then the plain print, keeping the prints chosen in the deck', () => {
    const choice = fee([MUSUBI, ALT, BASE]);
    expect(removedCopyPrint(choice, [MUSUBI, ALT, BASE])).toBe(BASE);
    expect(removedCopyPrint(choice, [MUSUBI, ALT])).toBe(ALT);
    // The deck chose the alt art for a copy: the copy on the default goes first.
    expect(removedCopyPrint(fee([MUSUBI, MUSUBI, BASE]), [ALT, MUSUBI])).toBe(MUSUBI);
  });
});

describe('family lines', () => {
  const members = new Set([BASE, MUSUBI]);

  it('reads the copies of a family and writes them back at the place of its first line', () => {
    const lines = [line('OTHER', 1), line(BASE, 2), line('LAST', 1), line(MUSUBI, 1)];
    expect(familyPrints(lines, members)).toEqual([BASE, BASE, MUSUBI]);
    const next = withFamilyPrints(lines, members, lines[1].card, [ALT, MUSUBI, MUSUBI]);
    expect(next.map((l) => [l.card.reference, l.quantity])).toEqual([
      ['OTHER', 1],
      [ALT, 1],
      [MUSUBI, 2],
      ['LAST', 1],
    ]);
    // A new print copies the card of the family, with its own reference.
    expect(next[1].card.name).toBe('Fée Clochette');
  });

  it('applies the defaults to every family, `null` when the deck has them already', () => {
    const choice = fee([MUSUBI, MUSUBI, BASE]);
    const choices = { [BASE]: choice, [MUSUBI]: choice };
    const out = linesWithDefaults([line(BASE, 3), line('OTHER', 2)], choices);
    expect(out?.map((l) => [l.card.reference, l.quantity])).toEqual([
      [MUSUBI, 2],
      [BASE, 1],
      ['OTHER', 2],
    ]);
    expect(linesWithDefaults(out ?? [], choices)).toBeNull();
  });

  it('compares copies whatever their order', () => {
    expect(sameCopies([BASE, MUSUBI], [MUSUBI, BASE])).toBe(true);
    expect(sameCopies([BASE, BASE], [MUSUBI, BASE])).toBe(false);
  });
});
