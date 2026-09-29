import { legalityFromStatus, lineViolationLabel, withServerVerdict, type DeckLegality } from '../../core/deck-legality';
import type { DeckStore } from '../../core/deck-store';
import { formatInfo } from '../../core/formats';
import type { ArOverlayService } from '../../ui/overlay';
import { openLegalityDetails } from '../shared/legality-details/legality-details.overlay';

/**
 * Legality shown in the editor: its own checks on the current content (every rule, passed or failed),
 * with the decks API's verdict on top while the deck is unchanged since the server checked it.
 */
export function editorLegality(deck: DeckStore): DeckLegality {
  return withServerVerdict(legalityFromStatus(deck.status(), !!deck.hero()), deck.legality());
}

/** Reasons shown on each deck line, by card reference. */
export function lineIssues(deck: DeckStore): ReadonlyMap<string, string[]> {
  return new Map(Object.entries(deck.status().violations).map(([ref, rules]) => [ref, rules.map(lineViolationLabel)]));
}

export function openEditorLegality(overlay: ArOverlayService, deck: DeckStore): void {
  openLegalityDetails(overlay, { format: formatInfo(deck.format()).label, legality: editorLegality(deck) });
}
