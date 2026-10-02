import { Component, inject } from '@angular/core';
import type { DeckImageSource } from '../../../core/deck-image';
import { ArIcon } from '../../../ui/icon';
import { ArOverlayRef } from '../../../ui/overlay';
import { runDeckImageAction, type DeckImageAction } from '../deck-image-actions';

export interface DeckActionsData {
  canDelete?: boolean;
  /** The deck's image (« Copier en image »), `null` outside the site. */
  image?: DeckImageSource | null;
  /** The deck's name: the saved image's. */
  name?: string;
}

/**
 * What the sheet asks the page to do. An image action has already started (the clipboard and the new tab need the
 * click): `image` resolves with the toast's message.
 */
export type DeckActionsResult = 'copy' | 'duplicate' | 'delete' | { image: Promise<string | null> };

/** « Plus d'actions » sheet on mobile. */
@Component({
  selector: 'app-deck-actions',
  imports: [ArIcon],
  host: { class: 'ar-overlay-content' },
  templateUrl: './deck-actions-sheet.html',
  styleUrl: './deck-actions-sheet.scss',
})
export class DeckActionsSheet {
  protected readonly ref = inject<ArOverlayRef<DeckActionsResult, DeckActionsData>>(ArOverlayRef);
  /** « Supprimer » only for the user's own decks. */
  protected readonly canDelete = this.ref.data?.canDelete !== false;
  protected readonly imageSource = this.ref.data?.image ?? null;

  protected image(action: DeckImageAction): void {
    if (!this.imageSource) return;
    this.ref.close({ image: runDeckImageAction(action, this.imageSource, this.ref.data?.name ?? '') });
  }
}
