import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { slotPrints } from '../../../core/alt-art-defaults';
import { cardImageUrl } from '../../../core/card-art';
import { OwnershipApiService, familyKey, type AltArtChoice } from '../../../core/ownership-api.service';
import { AcButton } from '../../../ui/buttons';
import { AcOverlayRef, AcOverlayService } from '../../../ui/overlay';
import { printLabel, saveFailed } from '../alt-art-labels';

/**
 * « Illustrations des jetons »: one illustration a token, shared by every deck (a token is not a deck card), saved as
 * the player's preference on the ownership service at once. A large preview of the chosen one, then the others.
 */
@Component({
  selector: 'app-token-arts',
  imports: [AcButton],
  host: { class: 'ac-overlay-content' },
  templateUrl: './token-arts.overlay.html',
  styleUrl: './token-arts.overlay.scss',
})
export class TokenArtsOverlay {
  protected readonly ref = inject(AcOverlayRef);
  private readonly ownership = inject(OwnershipApiService);
  /** `undefined` while loading, `[]` when no token has several illustrations (or on an error). */
  private readonly families = toSignal(this.ownership.tokenAltArts().pipe(catchError(() => of([]))));
  /** Illustrations chosen here, by family key (before the service confirms). */
  private readonly chosen = signal<Readonly<Record<string, string>>>({});
  /** A token whose choice was refused, with the reason. */
  protected readonly error = signal<{ key: string; message: string } | null>(null);
  private readonly saving = new Set<string>();

  protected readonly tokens = computed(() => {
    const list = this.families();
    if (!list) return undefined;
    const chosen = this.chosen();
    return list.map((f, i) => {
      const key = familyKey(f.family);
      const current = chosen[key] ?? slotPrints(f)[0] ?? f.options.options[0]?.reference ?? '';
      return {
        key,
        family: f,
        name: f.name || tokenLabel(i + 1),
        current,
        src: cardImageUrl(current),
        count: availableLabel(f.options.options.length),
        prints: f.options.options.map((o, j) => ({
          reference: o.reference,
          src: cardImageUrl(o.reference),
          on: o.reference === current,
          unowned: o.ownedQuantity === 0,
          label: o.ownedQuantity === 0 ? notOwnedLabel(j + 1) : printLabel(j + 1),
        })),
      };
    });
  });

  protected pick(token: { key: string; family: AltArtChoice; current: string }, reference: string): void {
    if (reference === token.current || this.saving.has(token.key)) return;
    const before = this.chosen();
    this.chosen.set({ ...before, [token.key]: reference });
    this.error.set(null);
    this.saving.add(token.key);
    this.ownership.setAltArtPreference(token.family.family, [reference]).subscribe({
      next: () => this.saving.delete(token.key),
      complete: () => this.saving.delete(token.key),
      error: (err: unknown) => {
        this.saving.delete(token.key);
        this.chosen.set(before);
        this.error.set({ key: token.key, message: err instanceof HttpErrorResponse && err.status === 409 ? notEnoughCopies() : saveFailed() });
      },
    });
  }
}

const tokenLabel = (n: number) => $localize`:@@editor.tokenArts.token:Jeton ${n}:n:`;
const notOwnedLabel = (n: number) => $localize`:@@editor.tokenArts.notOwned:Illustration ${n}:n: (non possédée)`;
const availableLabel = (n: number) => $localize`:@@editor.tokenArts.available:${n}:n: illustrations disponibles`;
const notEnoughCopies = () => $localize`:@@altArt.notEnoughCopies:Vous n’avez pas assez d’exemplaires de cet art alternatif.`;

export function openTokenArts(overlay: AcOverlayService): AcOverlayRef<void> {
  return overlay.open<TokenArtsOverlay, void>(TokenArtsOverlay, {
    title: $localize`:@@editor.tokenArts.title:Illustrations des jetons`,
    width: 760,
  });
}
