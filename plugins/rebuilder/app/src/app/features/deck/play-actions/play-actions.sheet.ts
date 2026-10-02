import { Component, inject } from '@angular/core';
import type { PlayZone } from '../../../core/test-hand';
import { AcIcon } from '../../../ui/icon';
import { AcOverlayRef } from '../../../ui/overlay';

export type PlayAction = PlayZone | 'zoom';

/** Game mode: what to do with a card of the hand or of the board (the site's action sheet; keyboard and touch). */
@Component({
  selector: 'app-play-actions',
  imports: [AcIcon],
  host: { class: 'ac-overlay-content' },
  templateUrl: './play-actions.sheet.html',
  styleUrl: './play-actions.sheet.scss',
})
export class PlayActionsSheet {
  protected readonly ref = inject<AcOverlayRef<PlayAction, { zone: PlayZone }>>(AcOverlayRef);
  protected readonly zone = this.ref.data.zone;
}
