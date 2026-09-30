import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, of, switchMap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { contentLocale } from '../../../core/locale';
import { cardImageUrl } from '../../../core/card-art';
import type { Card } from '../../../core/models';
import { localizedText } from '../../../core/models';
import { ArButton, ArStepper } from '../../../ui/buttons';
import { ArCardTile } from '../../../ui/metier';
import { OwnershipApiService, type AltArtChoice } from '../../../core/ownership-api.service';
import { AltArtSlots } from '../alt-art-slots/alt-art-slots';
import { ArOverlayRef, ArOverlayService } from '../../../ui/overlay';

export interface CardZoomData {
  card: Card;
  /** Editor: copies in the deck, changed from the window (as the site's deck builder lightbox). */
  quantity?: { value: number; max: number; change: (quantity: number) => void };
  /** Editor, per-deck alt-art mode: « Choisir une illustration » for a card of the deck (the site's lightbox). */
  illustrations?: { choice: AltArtChoice; pick: (reference: string) => void };
}

/** A card shown large, with a link to its sheet on the site (the site's card lightbox); in the editor, its copies. */
@Component({
  selector: 'app-card-zoom',
  imports: [ArCardTile, ArStepper, ArButton, AltArtSlots],
  host: { class: 'ar-overlay-content' },
  templateUrl: './card-zoom.overlay.html',
  styleUrl: './card-zoom.overlay.scss',
})
export class CardZoomOverlay {
  private readonly ref = inject<ArOverlayRef<void, CardZoomData>>(ArOverlayRef);
  private readonly ownership = inject(OwnershipApiService);
  protected readonly data = this.ref.data;
  /**
   * « Global » alt-art preference (as on the site): the card tilts under the pointer and its illustrations show with the
   * player's copies, `null` otherwise or for a card with one illustration.
   */
  private readonly global = toSignal(this.ownership.globalAltArts(), { initialValue: false });
  protected readonly altArts = toSignal(
    this.ownership.globalAltArts().pipe(
      switchMap((global) => (global ? this.ownership.altArtChoices([this.data.card.reference]) : of<Record<string, AltArtChoice>>({}))),
      map((choices) => choices[this.data.card.reference] ?? null),
    ),
    { initialValue: null },
  );
  protected readonly tilt = signal({ x: 0, y: 0 });
  protected readonly choosing = signal(false);
  protected readonly chosen = signal(this.data.card.reference);
  protected readonly prints = computed(() =>
    (this.data.illustrations?.choice.options.options ?? []).map((o) => ({ reference: o.reference, src: cardImageUrl(o.reference), unowned: o.ownedQuantity === 0 })),
  );
  protected readonly printLabel = (n: number) => $localize`:@@altArt.tile:Illustration ${n}:n:`;

  /** Unowned prints stay selectable: Board Game Arena shows the base art for the missing copies (as on the site). */
  protected confirmPrint(): void {
    const ref = this.chosen();
    if (ref !== this.data.card.reference) this.data.illustrations?.pick(ref);
    this.ref.close();
  }
  protected readonly quantity = signal(this.data.quantity?.value ?? 0);
  protected readonly name = computed(() => localizedText(this.data.card.name, contentLocale()) || this.data.card.reference);
  /** The site's card sheet (`/pages/card`, plugin core-altered-cards). */
  protected readonly detailUrl = `${environment.siteUrl.replace(/\/$/, '')}/pages/card?ref=${encodeURIComponent(this.data.card.reference)}&card_lang=${contentLocale()}`;

  protected onTilt(event: PointerEvent, el: HTMLElement): void {
    if (!this.global() || event.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    const x = (event.clientX - r.left) / r.width - 0.5;
    const y = (event.clientY - r.top) / r.height - 0.5;
    this.tilt.set({ x: Math.round(-y * 16), y: Math.round(x * 16) });
  }

  protected setQuantity(n: number): void {
    this.quantity.set(n);
    this.data.quantity?.change(n);
  }
}

export function openCardZoom(overlay: ArOverlayService, data: CardZoomData): ArOverlayRef<void, CardZoomData> {
  return overlay.open<CardZoomOverlay, void, CardZoomData>(CardZoomOverlay, {
    title: localizedText(data.card.name, contentLocale()) || data.card.reference,
    data,
    width: 420,
  });
}
