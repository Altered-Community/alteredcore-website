import { Component, inject } from '@angular/core';
import { map, type Observable } from 'rxjs';
import { AcButton } from '../../../ui/buttons';
import type { AcIconName } from '../../../ui/icon';
import { AcBreakpointService } from '../../../ui/layout.services';
import { AcOverlayRef, AcOverlayService } from '../../../ui/overlay';

export interface ConfirmData {
  title: string;
  message: string;
  confirmLabel: string;
  icon?: AcIconName;
  /** Irreversible action (delete): the confirm button is red. */
  danger?: boolean;
}

/** Confirmation window, in place of the browser's `confirm()`. Closes with `true` when confirmed. */
@Component({
  selector: 'app-confirm',
  imports: [AcButton],
  host: { class: 'ac-overlay-content' },
  templateUrl: './confirm.overlay.html',
  styleUrl: './confirm.overlay.scss',
})
export class ConfirmOverlay {
  protected readonly ref = inject<AcOverlayRef<boolean, ConfirmData>>(AcOverlayRef);
  protected readonly bp = inject(AcBreakpointService);
}

/** Emits once: `true` when the user confirms, `false` when they cancel or close the window. */
export function openConfirm(overlay: AcOverlayService, data: ConfirmData): Observable<boolean> {
  return overlay
    .open<ConfirmOverlay, boolean, ConfirmData>(ConfirmOverlay, { title: data.title, data, width: 440 })
    .afterClosed.pipe(map((ok) => ok === true));
}
