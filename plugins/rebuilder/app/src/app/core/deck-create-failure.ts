import { Service } from '@angular/core';
import { of, type Observable } from 'rxjs';

/** What to do after the decks API refused a new deck: try again, keep it in this browser, or give up. */
export type DeckCreateFailureChoice = 'retry' | 'local' | 'cancel';

/**
 * Asks the user what to do when a new deck could not be created on the account. The embedded app
 * provides the « Création impossible » window (`embedConfig`); without it (unit tests), the deck is
 * kept in this browser, as before.
 */
@Service({ factory: () => new KeepLocal() })
export abstract class DeckCreateFailurePrompt {
  /** `message`: displayable reason, with the API's violations when it gave some. */
  abstract ask(message: string): Observable<DeckCreateFailureChoice>;
}

class KeepLocal extends DeckCreateFailurePrompt {
  ask(message: string): Observable<DeckCreateFailureChoice> {
    console.warn('Re:Builder: server deck creation failed, keeping a local deck', message);
    return of('local');
  }
}
