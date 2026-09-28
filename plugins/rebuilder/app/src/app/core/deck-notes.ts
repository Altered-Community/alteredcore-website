import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

export interface DeckNote {
  deck: string;
  body: string;
  updatedAt: string | null;
}

/**
 * Private notes on account decks. Only the site build provides it (stored by the plugin's own PHP
 * endpoint, see embed/site-deck-notes.ts); without a provider the editor shows no notes.
 */
export interface DeckNotesApi {
  get(deckId: string): Observable<DeckNote>;
  save(deckId: string, body: string): Observable<DeckNote>;
}

export const DECK_NOTES = new InjectionToken<DeckNotesApi>('DECK_NOTES');
