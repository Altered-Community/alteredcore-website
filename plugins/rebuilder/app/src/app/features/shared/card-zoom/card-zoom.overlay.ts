import { Component, computed, inject, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { contentLocale } from '../../../core/locale';
import type { Card } from '../../../core/models';
import { localizedText } from '../../../core/models';
import { AcButton, AcStepper } from '../../../ui/buttons';
import { AcCardTile } from '../../../ui/metier';
import { AcOverlayRef, AcOverlayService } from '../../../ui/overlay';
import { openAltArtPicker, type AltArtPickerData } from '../../editor/alt-art-picker/alt-art-picker.overlay';

export interface CardZoomData {
  card: Card;
  /** Editor: copies in the deck, changed from the window (as the site's deck builder lightbox). */
  quantity?: { value: number; max: number; change: (quantity: number) => void };
  /** Editor, a card with several illustrations: « Choisir les illustrations » opens its brush in place of this window. */
  illustrations?: AltArtPickerData;
}

/** A card shown large, with a link to its sheet on the site (the site's card lightbox); in the editor, its copies. */
@Component({
  selector: 'app-card-zoom',
  imports: [AcCardTile, AcStepper, AcButton],
  host: { class: 'ac-overlay-content' },
  templateUrl: './card-zoom.overlay.html',
  styleUrl: './card-zoom.overlay.scss',
})
export class CardZoomOverlay {
  private readonly ref = inject<AcOverlayRef<void, CardZoomData>>(AcOverlayRef);
  private readonly overlay = inject(AcOverlayService);
  protected readonly data = this.ref.data;
  protected readonly quantity = signal(this.data.quantity?.value ?? 0);
  protected readonly name = computed(() => localizedText(this.data.card.name, contentLocale()) || this.data.card.reference);
  /** The site's card sheet (`/pages/card`, plugin core-altered-cards). */
  protected readonly detailUrl = `${environment.siteUrl.replace(/\/$/, '')}/pages/card?ref=${encodeURIComponent(this.data.card.reference)}&card_lang=${contentLocale()}`;

  protected setQuantity(n: number): void {
    this.quantity.set(n);
    this.data.quantity?.change(n);
  }

  /** The brush is a window of its own (the zoom has no frame for it): the zoom closes first, never two windows. */
  protected chooseIllustrations(): void {
    const data = this.data.illustrations;
    if (!data) return;
    const name = this.name();
    this.ref.close();
    openAltArtPicker(this.overlay, name, data);
  }
}

export function openCardZoom(overlay: AcOverlayService, data: CardZoomData): AcOverlayRef<void, CardZoomData> {
  return overlay.open<CardZoomOverlay, void, CardZoomData>(CardZoomOverlay, {
    title: localizedText(data.card.name, contentLocale()) || data.card.reference,
    data,
    width: 360,
    bare: true,
  });
}
