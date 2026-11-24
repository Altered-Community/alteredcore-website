import { lineIssuesOf, type DeckLegality } from '../../core/deck-legality';
import type { DeckStore } from '../../core/deck-store';
import { formatInfo } from '../../core/formats';
import type { AcOverlayService } from '../../ui/overlay';
import { openLegalityDetails } from '../shared/legality-details/legality-details.overlay';

/**
 * Legality shown in the editor: the decks API's answer to the last save (or to the GET), never computed here. A guest
 * deck, or one the API has not validated yet, is `unknown`.
 */
export function editorLegality(deck: DeckStore): DeckLegality {
  return deck.legality();
}

/** The API's problems shown on each deck line, by card reference (every print of the card it names). */
export function lineIssues(deck: DeckStore): ReadonlyMap<string, string[]> {
  return lineIssuesOf(deck.legality(), deck.lines().map((l) => l.card.reference));
}

export function openEditorLegality(overlay: AcOverlayService, deck: DeckStore): void {
  openLegalityDetails(overlay, { format: formatInfo(deck.format()).label, legality: editorLegality(deck) });
}
