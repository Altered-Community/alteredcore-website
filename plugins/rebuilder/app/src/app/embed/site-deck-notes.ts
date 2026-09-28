import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { DeckNote, DeckNotesApi } from '../core/deck-notes';
import { ALTERED_CORE } from './host';

/** Deck notes in the site database, through the plugin's endpoint `/papi/rebuilder/notes`. */
@Injectable()
export class SiteDeckNotes implements DeckNotesApi {
  private readonly http = inject(HttpClient);
  private readonly url = inject(ALTERED_CORE).page.apiUrl + 'notes';

  get(deckId: string): Observable<DeckNote> {
    return this.http.get<DeckNote>(this.url, { params: { deck: deckId } });
  }

  save(deckId: string, body: string): Observable<DeckNote> {
    return this.http.put<DeckNote>(this.url, { deck: deckId, body });
  }
}
