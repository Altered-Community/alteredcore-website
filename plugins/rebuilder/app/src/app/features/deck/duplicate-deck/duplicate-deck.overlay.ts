import { Component, inject, signal } from '@angular/core';
import { AuthSession } from '../../../core/auth-session';
import { DeckStore } from '../../../core/deck-store';
import { AcButton } from '../../../ui/buttons';
import { AcInput } from '../../../ui/fields';
import { AcBreakpointService } from '../../../ui/layout.services';
import { AcOverlayRef, AcOverlayService } from '../../../ui/overlay';

/**
 * « Dupliquer le deck »: name of the copy, pre-filled « <nom> (copie) ». Signed in, the copy is a
 * private deck of the account; as a guest, a deck of this browser. Closes with the copy's id.
 */
@Component({
  selector: 'app-duplicate-deck',
  imports: [AcButton, AcInput],
  host: { class: 'ac-overlay-content' },
  templateUrl: './duplicate-deck.overlay.html',
  styleUrl: './duplicate-deck.overlay.scss',
})
export class DuplicateDeckOverlay {
  protected readonly ref = inject<AcOverlayRef<string>>(AcOverlayRef);
  protected readonly bp = inject(AcBreakpointService);
  protected readonly auth = inject(AuthSession);
  private readonly deck = inject(DeckStore);

  protected readonly name = signal(this.deck.duplicateName());
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  submit(): void {
    if (this.busy()) return;
    const name = this.name().trim();
    if (!name) {
      this.error.set($localize`:@@deck.duplicate.nameRequired:Nom requis.`);
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.deck.duplicate(name).subscribe({
      next: (id) => this.ref.close(id),
      error: (err: Error) => {
        this.busy.set(false);
        this.error.set(err.message);
      },
    });
  }
}

export function openDuplicateDeck(overlay: AcOverlayService): AcOverlayRef<string> {
  return overlay.open<DuplicateDeckOverlay, string>(DuplicateDeckOverlay, {
    title: $localize`:@@deck.duplicate.title:Dupliquer le deck`,
    width: 440,
  });
}
