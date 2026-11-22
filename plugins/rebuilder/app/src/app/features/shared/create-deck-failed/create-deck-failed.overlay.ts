import { Component, Service, inject } from '@angular/core';
import { map, type Observable } from 'rxjs';
import { DeckCreateFailurePrompt, type DeckCreateFailureChoice } from '../../../core/deck-create-failure';
import { AcButton } from '../../../ui/buttons';
import { AcBreakpointService } from '../../../ui/layout.services';
import { AcOverlayRef, AcOverlayService } from '../../../ui/overlay';

/**
 * « Création impossible »: the decks API refused the new deck. Shows its reason and offers to try
 * again or to create the deck in this browser only. Closes with the choice (nothing = cancel).
 */
@Component({
  selector: 'app-create-deck-failed',
  imports: [AcButton],
  host: { class: 'ac-overlay-content' },
  templateUrl: './create-deck-failed.overlay.html',
  styleUrl: './create-deck-failed.overlay.scss',
})
export class CreateDeckFailedOverlay {
  protected readonly ref = inject<AcOverlayRef<'retry' | 'local', string>>(AcOverlayRef);
  protected readonly bp = inject(AcBreakpointService);
}

export function openCreateDeckFailed(overlay: AcOverlayService, message: string): AcOverlayRef<'retry' | 'local', string> {
  return overlay.open<CreateDeckFailedOverlay, 'retry' | 'local', string>(CreateDeckFailedOverlay, {
    title: $localize`:@@shared.createFailed.title:Création impossible`,
    data: message,
    width: 480,
  });
}

/** `DeckCreateFailurePrompt` of the embedded app (provided by `embedConfig`). */
@Service({ autoProvided: false })
export class OverlayDeckCreateFailurePrompt extends DeckCreateFailurePrompt {
  private readonly overlay = inject(AcOverlayService);

  ask(message: string): Observable<DeckCreateFailureChoice> {
    return openCreateDeckFailed(this.overlay, message).afterClosed.pipe(map((choice) => choice ?? 'cancel'));
  }
}
