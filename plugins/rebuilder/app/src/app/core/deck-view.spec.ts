import { cardImageSources, isUniqueReference, setImageUrl, uniqueArtSources, uniqueCardId } from './card-art';
import { CARD_SETS } from './card-filters';
import { cardToLine, deckStats, decklistText, groupByCost, groupLines, heroOf, lastModified, lineToCard, mergeUniqueFace, toDeckListItem, uniqueNeedsPrintedEffect } from './deck-view';
import type { Card, Deck, HydratedLine } from './models';
import { localizedText } from './models';

const rows: HydratedLine[] = [
  { quantity: 3, card: { reference: 'ALT_CORE_B_YZ_10_C', name: 'Zou !', cardType: { reference: 'SPELL' }, mainCost: 2, recallCost: 4 } },
  {
    quantity: 2,
    card: {
      reference: 'ALT_CORE_B_YZ_11_R1',
      name: 'Baba Yaga',
      cardType: { reference: 'CHARACTER' },
      mainCost: 3,
      recallCost: 2,
      forestPower: 3,
      mountainPower: 2,
      oceanPower: 2,
    },
  },
  { quantity: 1, card: { reference: 'ALT_CORE_B_YZ_12_C', name: 'Apprenti', cardType: { reference: 'CHARACTER' }, mainCost: 1, recallCost: 1, forestPower: 1 } },
  { quantity: 1, card: { reference: 'ALT_CORE_B_YZ_13_C', name: 'Big', cardType: { reference: 'SPELL' }, mainCost: 9, recallCost: 8 } },
];

describe('line ⇄ card mappers', () => {
  it('round-trips the rich decks API line shape', () => {
    const line = cardToLine(rows[1].card, 2);
    expect(line).toMatchObject({ cardReference: 'ALT_CORE_B_YZ_11_R1', quantity: 2, cardTypeReference: 'CHARACTER', forestPower: 3 });
    expect(lineToCard(line)).toMatchObject({ reference: 'ALT_CORE_B_YZ_11_R1', name: 'Baba Yaga', mainCost: 3, recallCost: 2 });
    expect(line.mainEffect).toBeUndefined();
  });

  it('keeps a unique’s printed effect on the guest line and fills it when the line has none', () => {
    const unique: Card = {
      reference: 'ALT_DUSTER_B_YZ_87_U_3890',
      name: { fr: 'Chasseur de Hextag' },
      cardType: { reference: 'CHARACTER', name: { fr: 'Personnage' } },
      cardSubTypes: [{ name: { fr: 'Gredin' } }],
      mainCost: 2,
      recallCost: 1,
      mainEffect: { fr: '{J} Piochez une carte.' },
      echoEffect: { fr: '{D} : [] [Ravitaillez].' },
    };
    const line = cardToLine(unique, 1);
    expect(line.mainEffect).toEqual({ fr: '{J} Piochez une carte.' });
    expect(localizedText(lineToCard(line).mainEffect, 'fr')).toBe('{J} Piochez une carte.');
    expect(uniqueNeedsPrintedEffect(lineToCard({ cardReference: unique.reference, quantity: 1, name: 'Chasseur de Hextag', mainCost: 2 }))).toBe(true);

    const bare = lineToCard({ cardReference: unique.reference, quantity: 1, name: 'Chasseur de Hextag', mainCost: 2, recallCost: 1 });
    const face = mergeUniqueFace(bare, unique);
    expect(localizedText(face.mainEffect, 'fr')).toBe('{J} Piochez une carte.');
    expect(face.mainCost).toBe(2);
    expect(face.cardSubTypes?.[0]).toEqual({ name: { fr: 'Gredin' } });
    expect(uniqueNeedsPrintedEffect(face)).toBe(false);
    expect(mergeUniqueFace(unique, { ...unique, mainEffect: { fr: 'remplacé' } }).mainEffect).toEqual(unique.mainEffect);
  });
});

describe('groupLines / groupByCost', () => {
  it('groups characters before spells, sorted by cost then name', () => {
    const groups = groupLines(rows);
    expect(groups.map((g) => [g.label, g.count, g.distinct])).toEqual([
      ['Personnages', 3, 2],
      ['Sorts', 4, 2],
    ]);
    expect(groups[0].lines.map((l) => l.card.name)).toEqual(['Apprenti', 'Baba Yaga']);
  });

  it('buckets 7+ costs together', () => {
    expect(groupByCost(rows).map((g) => g.label)).toEqual(['Coût 1', 'Coût 2', 'Coût 3', 'Coût 7+']);
  });
});

describe('deckStats', () => {
  it('builds cost histograms, terrain totals (characters only) and rarity counts', () => {
    const s = deckStats(rows);
    expect(s.main).toEqual([1, 3, 2, 0, 0, 0, 1]);
    expect(s.reserve).toEqual([1, 2, 0, 3, 0, 0, 1]);
    expect(s.terrain).toEqual({ foret: 7, montagne: 4, ocean: 4 });
    expect(s.rarity).toEqual({ C: 5, R: 2, U: 0, E: 0 });
  });
});

describe('lastModified', () => {
  it('takes the latest of createdAt and updatedAt, or the only one present', () => {
    expect(lastModified({ createdAt: '2026-05-01T10:00:00+00:00', updatedAt: '2026-09-26T11:23:07+00:00' })).toBe('2026-09-26T11:23:07+00:00');
    expect(lastModified({ createdAt: '2026-05-01T10:00:00+00:00', updatedAt: null })).toBe('2026-05-01T10:00:00+00:00');
    expect(lastModified({ updatedAt: '2026-09-26T11:23:07+00:00' })).toBe('2026-09-26T11:23:07+00:00');
    // Offsets are compared as instants, not as strings.
    expect(lastModified({ createdAt: '2026-09-26T12:00:00+02:00', updatedAt: '2026-09-26T11:00:00+00:00' })).toBe('2026-09-26T11:00:00+00:00');
    expect(lastModified({ createdAt: 'nope', updatedAt: null })).toBe('');
    expect(lastModified({})).toBe('');
  });
});

describe('toDeckListItem', () => {
  it('reads the author from `user.username`, and none from the `[]` the public list sends today', () => {
    const base: Deck = { id: 'p1', name: 'Zoo', format: 'frontier', legal: true, stats: { totalCards: 39, hero: { reference: 'ALT_CORE_B_MU_01_C', name: 'Teija & Nauraa' } } };
    expect(toDeckListItem({ ...base, user: { username: ' Yutsa ' } }).author).toBe('Yutsa');
    expect(toDeckListItem({ ...base, user: [] }).author).toBeNull();
    expect(toDeckListItem(base).author).toBeNull();
  });

  it('summarises a guest deck from its lines', () => {
    const deck: Deck = {
      id: 'guest-1',
      name: 'Moyo',
      format: 'frontier',
      guest: true,
      hero: { reference: 'ALT_CORE_B_YZ_01_C', name: 'Moyo & Silk', faction: 'YZ' },
      deckCards: [
        { cardReference: 'ALT_CORE_B_YZ_01_C', quantity: 1, cardTypeReference: 'HERO' },
        { cardReference: 'ALT_CORE_B_YZ_10_C', quantity: 3, cardTypeReference: 'SPELL' },
      ],
    };
    const item = toDeckListItem(deck);
    expect(item).toMatchObject({ total: 3, formatLabel: 'Frontier', formatTone: 'violet', legal: false, guest: true });
    expect(item.rarity).toEqual({ C: 3, R: 0, U: 0, E: 0 });
  });

  it('uses public list stats when lines are absent', () => {
    const item = toDeckListItem({
      id: 'x',
      name: 'Public',
      format: 'standard',
      legal: true,
      stats: { totalCards: 39, hero: { reference: 'ALT_CORE_B_LY_03_C', name: 'Fen & Crowbar' }, byRarity: { C: 21, R: 15, U: 3, E: 0 } },
    });
    expect(item.hero).toEqual({ reference: 'ALT_CORE_B_LY_03_C', name: 'Fen & Crowbar', faction: 'LY' });
    expect(item.total).toBe(39);
    expect(item.legal).toBe(true);
    expect(heroOf({ id: 'y', name: 'n' })).toBeNull();
  });
});

describe('decklistText', () => {
  it('writes "qty reference" lines with the hero first', () => {
    expect(decklistText(rows.slice(0, 1), { reference: 'ALT_CORE_B_YZ_01_C', name: 'Moyo', faction: 'YZ' })).toBe(
      '1 ALT_CORE_B_YZ_01_C\n3 ALT_CORE_B_YZ_10_C',
    );
  });
});

describe('card art', () => {
  it('shows a unique with its own illustration, never the common print', () => {
    expect(uniqueCardId('ALT_EOLE_B_OR_109_U_374')).toBe('ALT_EOLE_B_OR_109');
    expect(isUniqueReference('ALT_EOLE_B_OR_109_R1')).toBe(false);
    expect(cardImageSources('ALT_EOLE_B_OR_109_U_374')).toEqual([
      'https://cdn.alteredcore.org/illustrations/EOLE/ALT_EOLE_B_OR_109_U_FRAMELESS_T1.webp',
      'https://cdn.alteredcore.org/cards/assets/EOLE/ALT_EOLE_B_OR_109_U.webp',
      'assets/img/cardback.webp',
    ]);
    expect(cardImageSources('ALT_CORE_B_AX_04_C')).toEqual([
      'https://cdn.alteredcore.org/cards/fr/CORE/ALT_CORE_B_AX_04_C.webp',
      'assets/img/cardback.webp',
    ]);
  });

  it('tries the CORE illustration for a Kickstarter unique', () => {
    expect(uniqueArtSources('ALT_COREKS_B_AX_06_U_12')).toContain(
      'https://cdn.alteredcore.org/illustrations/CORE/ALT_CORE_B_AX_06_U_FRAMELESS_T1.webp',
    );
  });

  it('points every extension at its small set logo', () => {
    expect(CARD_SETS.map((set) => set.reference).sort()).toEqual(
      ['ALIZE', 'BISE', 'CORE', 'COREKS', 'CYCLONE', 'DUSTER', 'EOLE', 'FUGUE'],
    );
    for (const set of CARD_SETS) {
      expect(setImageUrl(set.reference)).toBe(`assets/set-logos/${set.reference}.svg`);
    }
  });
});
