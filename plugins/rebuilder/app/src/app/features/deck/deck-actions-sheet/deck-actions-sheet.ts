import { Component, inject } from '@angular/core';
import { AcIcon } from '../../../ui/icon';
import { AcOverlayRef } from '../../../ui/overlay';

/** « Plus d'actions » sheet on mobile. */
@Component({
  selector: 'app-deck-actions',
  imports: [AcIcon],
  host: { class: 'ac-overlay-content' },
  templateUrl: './deck-actions-sheet.html',
  styleUrl: './deck-actions-sheet.scss',
})
export class DeckActionsSheet {
  protected readonly ref = inject<AcOverlayRef<'copy' | 'duplicate' | 'delete', { canDelete?: boolean }>>(AcOverlayRef);
  /** « Supprimer » only for the user's own decks. */
  protected readonly canDelete = this.ref.data?.canDelete !== false;
}
