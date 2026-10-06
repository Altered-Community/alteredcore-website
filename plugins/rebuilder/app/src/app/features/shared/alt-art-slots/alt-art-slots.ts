import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { cardImageUrl } from '../../../core/card-art';
import { OwnershipApiService, type AltArtChoice } from '../../../core/ownership-api.service';
import { AcIcon } from '../../../ui/icon';

/**
 * The illustrations of a card family with the player's copies on them (one marker a copy), as the site's alt-art
 * widget in the card lightbox: an owned illustration takes the active marker, the active marker then moves on; the
 * site saves the choice and a refusal puts the marker back, with the reason. Markers are numbered by copy (1, 2, 3),
 * not by the API's `slotIndex`; a family with one copy (hero, token) has a single marker without a number.
 */
@Component({
  selector: 'app-alt-art-slots',
  imports: [AcIcon],
  templateUrl: './alt-art-slots.html',
  styleUrl: './alt-art-slots.scss',
})
export class AltArtSlots {
  private readonly ownership = inject(OwnershipApiService);
  readonly choice = input.required<AltArtChoice>();
  protected readonly slots = linkedSignal(() => [...this.choice().options.slots].sort((a, b) => a.slotIndex - b.slotIndex));
  /** The first copy moves first, then the next ones (the site's widget), so successive picks fill copies 1, 2, 3. */
  protected readonly active = linkedSignal(() => this.slots()[0]?.slotIndex ?? 0);
  protected readonly single = computed(() => this.slots().length === 1);
  protected readonly error = signal<string | null>(null);
  /** A save is running: the tiles wait for it, so that saves never cross (a late refusal would undo a later choice). */
  protected readonly saving = signal(false);
  protected readonly tiles = computed(() =>
    this.choice().options.options.map((o) => ({
      reference: o.reference,
      src: cardImageUrl(o.reference),
      owned: o.ownedQuantity === null || o.ownedQuantity > 0,
      markers: this.slots()
        .map((s, i) => ({ slotIndex: s.slotIndex, copy: i + 1, reference: s.reference }))
        .filter((s) => s.reference === o.reference),
    })),
  );
  protected readonly tileLabel = (n: number) => $localize`:@@altArt.tile:Illustration ${n}:n:`;
  protected readonly markerLabel = (n: number) => $localize`:@@altArt.marker:Exemplaire ${n}:n:`;
  protected readonly chosenLabel = $localize`:@@altArt.chosen:Illustration choisie`;

  /** An owned illustration: the active marker (or the next one not already there) moves onto it. */
  protected pick(reference: string, owned: boolean): void {
    if (!owned || this.saving()) return;
    const slots = this.slots();
    const start = Math.max(0, slots.findIndex((s) => s.slotIndex === this.active()));
    let moved: { slotIndex: number; reference: string } | undefined;
    for (let i = 0; i < slots.length; i++) {
      const candidate = slots[(start + i) % slots.length];
      if (candidate.reference !== reference) {
        moved = candidate;
        break;
      }
    }
    if (!moved) return;
    const before = slots;
    const beforeActive = this.active();
    const next = slots.map((s) => (s.slotIndex === moved.slotIndex ? { ...s, reference } : s));
    const index = next.findIndex((s) => s.slotIndex === moved.slotIndex);
    this.slots.set(next);
    this.active.set(next[(index + 1) % next.length].slotIndex);
    this.error.set(null);
    this.saving.set(true);
    this.ownership.setAltArtPreference(this.choice().family, next.map((s) => s.reference)).pipe(finalize(() => this.saving.set(false))).subscribe({
      error: (err: unknown) => {
        this.slots.set(before);
        this.active.set(beforeActive);
        this.error.set(saveError(err));
      },
    });
  }

  protected selectMarker(slotIndex: number, event: Event): void {
    event.stopPropagation();
    this.active.set(slotIndex);
  }
}

function saveError(err: unknown): string {
  const head = $localize`:@@altArt.saveError:Impossible d’enregistrer votre choix.`;
  if (err instanceof HttpErrorResponse && err.status === 409 && Array.isArray(err.error)) {
    const detail = (err.error as { reference?: string; requested?: number; owned?: number }[])
      .map((s) => `${s.reference} (${s.requested}/${s.owned})`)
      .join(', ');
    return detail ? `${head} — ${detail}` : head;
  }
  return head;
}
