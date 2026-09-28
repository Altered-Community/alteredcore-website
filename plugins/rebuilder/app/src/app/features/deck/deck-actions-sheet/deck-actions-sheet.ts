import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ArIcon } from '../../../ui/icon';
import { ArOverlayRef } from '../../../ui/overlay';

/** « Plus d'actions » sheet on mobile. */
@Component({
  selector: 'app-deck-actions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArIcon],
  host: { class: 'ar-overlay-content' },
  templateUrl: './deck-actions-sheet.html',
  styleUrl: './deck-actions-sheet.scss',
})
export class DeckActionsSheet {
  protected readonly ref = inject<ArOverlayRef<'copy' | 'duplicate' | 'delete', { canDelete?: boolean }>>(ArOverlayRef);
  /** « Supprimer » only for the user's own decks. */
  protected readonly canDelete = this.ref.data?.canDelete !== false;
}
