import { Observable, map, of, switchMap } from 'rxjs';
import { deckImageSource, type DeckImageSource } from '../../core/deck-image';
import type { DeckStore } from '../../core/deck-store';
import { decklistText } from '../../core/deck-view';
import { GuestDeckService } from '../../core/guest-deck.service';
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
 * « Supprimer » (deck page, editor): asks first, then deletes. Emits `null` when the user gives up, `true` once deleted,
 * the message to show when the deck could not be deleted.
 */
export function confirmDeleteDeck(overlay: AcOverlayService, deck: DeckStore): Observable<true | string | null> {
  return openConfirm(overlay, {
    title: $localize`:@@deck.page.deleteTitle:Supprimer le deck ?`,
    message: $localize`:@@deck.page.deleteConfirm:« ${deck.name()}:name: » sera supprimé. Cette action est irréversible.`,
    confirmLabel: $localize`:@@deck.page.deleteAction:Supprimer`,
    icon: 'trash-2',
    danger: true,
  }).pipe(
    switchMap((confirmed) => (confirmed ? deck.delete() : of(null))),
    map((ok) => (ok === null ? null : ok || (deck.actionError() ?? $localize`:@@deck.page.deleteFailed:Suppression impossible.`))),
  );
}

/** The deck's image (« Copier en image »): a deck of the decks API by its id, a guest deck by its cards on this device. */
export function deckImageSourceFor(id: string, guests: GuestDeckService): DeckImageSource | null {
  if (!GuestDeckService.isGuestId(id)) return deckImageSource(id);
  const guest = guests.get(id);
  return guest ? deckImageSource(id, guest) : null;
}
