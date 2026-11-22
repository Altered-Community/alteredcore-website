import { Component, inject } from '@angular/core';
import { AcButton } from '../../../ui/buttons';
import { AcIcon } from '../../../ui/icon';
import { AcBreakpointService } from '../../../ui/layout.services';
import { AcOverlayRef, AcOverlayService } from '../../../ui/overlay';

/**
 * « Connectez-vous pour partager »: a guest deck lives on this device only, so it has no link. Closes with `true` for
 * « Se connecter » (the editor then moves the deck to the account and opens the share window), nothing for « Plus tard ».
 */
@Component({
  selector: 'app-sign-in-to-share',
  imports: [AcButton, AcIcon],
  host: { class: 'ac-overlay-content' },
  templateUrl: './sign-in-to-share.overlay.html',
  styleUrl: './sign-in-to-share.overlay.scss',
})
export class SignInToShareOverlay {
  protected readonly ref = inject<AcOverlayRef<true>>(AcOverlayRef);
  protected readonly bp = inject(AcBreakpointService);
}

export function openSignInToShare(overlay: AcOverlayService): AcOverlayRef<true> {
  return overlay.open<SignInToShareOverlay, true>(SignInToShareOverlay, {
    title: $localize`:@@editor.signInToShare.title:Connectez-vous pour partager`,
    width: 440,
  });
}
