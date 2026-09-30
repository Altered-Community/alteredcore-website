import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { OwnershipApiService } from '../../../core/ownership-api.service';
import { ArButton } from '../../../ui/buttons';
import { ArOverlayRef, ArOverlayService } from '../../../ui/overlay';
import { AltArtSlots } from '../../shared/alt-art-slots/alt-art-slots';

/** « Illustrations des jetons »: the prints of the tokens, a preference shared by every deck (the site's window). */
@Component({
  selector: 'app-token-arts',
  imports: [AltArtSlots, ArButton],
  host: { class: 'ar-overlay-content' },
  templateUrl: './token-arts.overlay.html',
  styleUrl: './token-arts.overlay.scss',
})
export class TokenArtsOverlay {
  protected readonly ref = inject(ArOverlayRef);
  /** `undefined` while loading, `[]` when no token has several illustrations (or on an error). */
  protected readonly families = toSignal(
    inject(OwnershipApiService)
      .tokenAltArts()
      .pipe(catchError(() => of([]))),
  );
}

export function openTokenArts(overlay: ArOverlayService): ArOverlayRef<void> {
  return overlay.open<TokenArtsOverlay, void>(TokenArtsOverlay, {
    title: $localize`:@@editor.tokenArts.title:Illustrations des jetons`,
    width: 640,
  });
}
