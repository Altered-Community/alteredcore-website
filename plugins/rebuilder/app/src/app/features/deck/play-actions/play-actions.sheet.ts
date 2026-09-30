import { Component, inject } from '@angular/core';
import type { PlayZone } from '../../../core/test-hand';
import { ArIcon } from '../../../ui/icon';
import { ArOverlayRef } from '../../../ui/overlay';

export type PlayAction = PlayZone | 'zoom';

/** Game mode: what to do with a card of the hand or of the board (the site's action sheet; keyboard and touch). */
@Component({
  selector: 'app-play-actions',
  imports: [ArIcon],
  host: { class: 'ar-overlay-content' },
  templateUrl: './play-actions.sheet.html',
  styleUrl: './play-actions.sheet.scss',
})
export class PlayActionsSheet {
  protected readonly ref = inject<ArOverlayRef<PlayAction, { zone: PlayZone }>>(ArOverlayRef);
  protected readonly zone = this.ref.data.zone;
}
