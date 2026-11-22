import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DeckStore } from '../../core/deck-store';
import type { Card } from '../../core/models';
import { editorLegality, lineIssues } from './editor-legality';

const moyo = { reference: 'ALT_CORE_B_YZ_65_C', name: 'Moyo', faction: 'YZ' };
const fen = { reference: 'ALT_CORE_B_LY_03_C', name: 'Fen', faction: 'LY' };
const yzmir = (i: number): Card => ({
  reference: `ALT_CORE_B_YZ_${10 + i}_C`,
  name: `Yzmir ${i}`,
  cardType: { reference: 'SPELL' },
  faction: { code: 'YZ', name: 'Yzmir' },
});
const bannedUnique: Card = {
  reference: 'ALT_CORE_B_YZ_05_U_141',
  name: 'Banned',
  cardType: { reference: 'CHARACTER' },
  rarity: { reference: 'UNIQUE' },
  faction: { code: 'YZ', name: 'Yzmir' },
  isBanned: true,
};

describe('editor legality', () => {
  let store: DeckStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    store = TestBed.inject(DeckStore);
    store.create({ name: 'D', hero: moyo, format: 'standard', isPublic: false });
    for (let i = 0; i < 13; i++) store.setQuantity(yzmir(i), 3);
  });

  it('lists every rule of the format, passed', () => {
    const legality = editorLegality(store);
    expect(legality.state).toBe('legal');
    expect(legality.checks?.every((c) => c.ok)).toBe(true);
    expect(legality.checks?.[0].rule).toBe('hero');
  });

  it('makes the deck illegal and flags each line when the hero changes faction', () => {
    store.updateSettings({ hero: fen });
    const legality = editorLegality(store);
    expect(legality.state).toBe('illegal');
    expect(legality.rules).toEqual(['faction']);
    expect(lineIssues(store).get('ALT_CORE_B_YZ_10_C')).toEqual(['Hors de la faction du héros']);
    expect(lineIssues(store).size).toBe(13);
  });

  it('keeps a banned card flagged after the guest deck is reloaded', () => {
    store.setQuantity(yzmir(0), 2);
    store.setQuantity(bannedUnique, 1);
    expect(lineIssues(store).get(bannedUnique.reference)).toEqual(['Carte bannie']);
    const id = store.deckId()!;
    store.flush();
    store.clear();
    store.load(id);
    expect(store.total()).toBe(39);
    expect(editorLegality(store).rules).toEqual(['bannedCards']);
    expect(lineIssues(store).get(bannedUnique.reference)).toEqual(['Carte bannie']);
  });

  it('blocks Uniques once the format forbids them, and flags those already in the deck', () => {
    store.setQuantity(yzmir(0), 2);
    store.setQuantity({ ...bannedUnique, isBanned: false }, 1);
    store.updateSettings({ format: 'nuc' });
    expect(store.maxFor(bannedUnique)).toBe(0);
    expect(editorLegality(store).rules).toEqual(['uniqueQuantity']);
    expect(lineIssues(store).get(bannedUnique.reference)).toEqual(['Cartes uniques interdites dans ce format']);
  });
});
