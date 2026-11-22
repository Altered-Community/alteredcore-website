import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DeckStore } from '../../core/deck-store';
import type { Card, Deck } from '../../core/models';
import { editorLegality, lineIssues } from './editor-legality';

const moyo = { reference: 'ALT_CORE_B_YZ_65_C', name: 'Moyo', faction: 'YZ' };
const yzmir = (i: number): Card => ({
  reference: `ALT_CORE_B_YZ_${10 + i}_C`,
  name: `Yzmir ${i}`,
  cardType: { reference: 'SPELL' },
  faction: { code: 'YZ', name: 'Yzmir' },
});

describe('editor legality', () => {
  let store: DeckStore;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    store = TestBed.inject(DeckStore);
    http = TestBed.inject(HttpTestingController);
  });

  it('computes nothing for a guest deck: its legality is unknown', () => {
    store.create({ name: 'D', hero: moyo, format: 'standard', isPublic: false });
    for (let i = 0; i < 2; i++) store.setQuantity(yzmir(i), 4);
    expect(editorLegality(store).state).toBe('unknown');
    expect(lineIssues(store).size).toBe(0);
  });

  it('shows the decks API’s problems, on every print of the card they name', async () => {
    store.load('d1');
    TestBed.tick();
    const message = 'Carte « Yzmir 0 » : 4 exemplaires (max 3).';
    const deck: Deck = {
      id: 'd1',
      name: 'D',
      format: 'standard',
      legal: false,
      legalityDetail: { hero: true, copies: false, deckSize: false, global: false },
      errors: [
        { code: 'card.family.copies', reference: 'ALT_CORE_B_YZ_10_C', message },
        { code: 'deck.size.min', reference: null, message: 'Le deck doit contenir au moins 39 cartes.' },
      ],
      deckCards: [
        { cardReference: moyo.reference, quantity: 1, cardTypeReference: 'HERO' },
        { cardReference: 'ALT_CORE_A_YZ_10_C', quantity: 1, cardTypeReference: 'SPELL' },
        { cardReference: 'ALT_CORE_B_YZ_10_C', quantity: 3, cardTypeReference: 'SPELL' },
        { cardReference: 'ALT_CORE_B_YZ_11_C', quantity: 1, cardTypeReference: 'SPELL' },
      ],
    };
    http.expectOne((r) => r.url.endsWith('/api/decks/d1')).flush(deck);
    await TestBed.inject(ApplicationRef).whenStable();
    TestBed.tick();
    const legality = editorLegality(store);
    expect(legality.state).toBe('illegal');
    expect(legality.rules).toEqual(['copies', 'deckSize']);
    expect(legality.errors).toHaveLength(2);
    const issues = lineIssues(store);
    expect(issues.get('ALT_CORE_A_YZ_10_C')).toEqual([message]);
    expect(issues.get('ALT_CORE_B_YZ_10_C')).toEqual([message]);
    expect(issues.has('ALT_CORE_B_YZ_11_C')).toBe(false);
  });
});
