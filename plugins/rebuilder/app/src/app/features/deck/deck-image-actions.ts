import { copyDeckImage, DeckImageUnavailable, downloadDeckImage, openDeckImage } from '../../core/deck-image';

/** « Copier en image » (deck page) and its menu: copy to the clipboard, save, open in a new tab. */
export type DeckImageAction = 'copy' | 'save' | 'open';

/** Shown while the image is drawn (the mobile sheet's toast; the desktop button's label). */
export function deckImageBusyMessage(): string {
  return $localize`:@@deck.image.busy:Génération de l’image…`;
}

/**
 * Runs `action` on the deck's image; resolves with the toast's message, `null` when the browser shows the outcome
 * (download, new tab). Call it during the click: the clipboard and the new tab need the click's permission.
 */
export async function runDeckImageAction(action: DeckImageAction, url: string, name: string): Promise<string | null> {
  try {
    if (action === 'copy') {
      await copyDeckImage(url);
      return $localize`:@@deck.image.copied:Image copiée dans le presse-papiers.`;
    }
    await (action === 'save' ? downloadDeckImage(url, name) : openDeckImage(url));
    return null;
  } catch (err) {
    return err instanceof DeckImageUnavailable
      ? $localize`:@@deck.image.unavailable:Image du deck indisponible pour le moment. Réessayez plus tard.`
      : $localize`:@@deck.image.copyFailed:Copie de l’image impossible dans ce navigateur. Enregistrez-la plutôt.`;
  }
}
