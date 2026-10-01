import { Component, inject, signal } from '@angular/core';
import { AuthSession } from '../../../core/auth-session';
import { DeckStore } from '../../../core/deck-store';
import { ArButton } from '../../../ui/buttons';
import { ArInput } from '../../../ui/fields';
import { ArBreakpointService } from '../../../ui/layout.services';
import { ArOverlayRef, ArOverlayService } from '../../../ui/overlay';

/**
 * « Dupliquer le deck »: name of the copy, pre-filled « <nom> (copie) ». Signed in, the copy is a
 * private deck of the account; as a guest, a deck of this browser. Closes with the copy's id.
 */
@Component({
  selector: 'app-duplicate-deck',
  imports: [ArButton, ArInput],
  host: { class: 'ar-overlay-content' },
  templateUrl: './duplicate-deck.overlay.html',
  styleUrl: './duplicate-deck.overlay.scss',
})
export class DuplicateDeckOverlay {
  protected readonly ref = inject<ArOverlayRef<string>>(ArOverlayRef);
  protected readonly bp = inject(ArBreakpointService);
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

export function openDuplicateDeck(overlay: ArOverlayService): ArOverlayRef<string> {
  return overlay.open<DuplicateDeckOverlay, string>(DuplicateDeckOverlay, {
    title: $localize`:@@deck.duplicate.title:Dupliquer le deck`,
    width: 440,
  });
}
