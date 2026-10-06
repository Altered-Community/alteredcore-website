import { Observable, of, switchMap } from 'rxjs';
import type { DeckStore } from '../../core/deck-store';
import { decklistText } from '../../core/deck-view';
import type { AcOverlayService } from '../../ui/overlay';
import { openConfirm } from '../shared/confirm/confirm.overlay';

/** « Copier la liste » (deck page, editor): the decklist in the clipboard; resolves with the toast's message. */
export async function copyDecklist(deck: DeckStore): Promise<string> {
  try {
    await navigator.clipboard.writeText(decklistText(deck.lines(), deck.hero()));
    return $localize`:@@deck.page.listCopied:Liste copiée dans le presse-papiers.`;
  } catch {
    return $localize`:@@deck.page.copyFailed:Copie impossible dans ce navigateur.`;
  }
}

/**
 * « Supprimer » (deck page, editor): asks first, then deletes. Emits `null` when the user gives up, the outcome
 * otherwise (`false`: refused, the message is in `deck.actionError()`).
 */
export function confirmDeleteDeck(overlay: AcOverlayService, deck: DeckStore): Observable<boolean | null> {
  return openConfirm(overlay, {
    title: $localize`:@@deck.page.deleteTitle:Supprimer le deck ?`,
    message: $localize`:@@deck.page.deleteConfirm:« ${deck.name()}:name: » sera supprimé. Cette action est irréversible.`,
    confirmLabel: $localize`:@@deck.page.deleteAction:Supprimer`,
    icon: 'trash-2',
    danger: true,
  }).pipe(switchMap((confirmed) => (confirmed ? deck.delete() : of(null))));
}
