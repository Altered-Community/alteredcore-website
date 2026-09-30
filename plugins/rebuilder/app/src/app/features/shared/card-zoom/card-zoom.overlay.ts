import { Component, computed, inject, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { contentLocale } from '../../../core/locale';
import type { Card } from '../../../core/models';
import { localizedText } from '../../../core/models';
import { ArButton, ArStepper } from '../../../ui/buttons';
import { ArCardTile } from '../../../ui/metier';
import { ArOverlayRef, ArOverlayService } from '../../../ui/overlay';

export interface CardZoomData {
  card: Card;
  /** Editor: copies in the deck, changed from the window (as the site's deck builder lightbox). */
  quantity?: { value: number; max: number; change: (quantity: number) => void };
}

/** A card shown large, with a link to its sheet on the site (the site's card lightbox); in the editor, its copies. */
@Component({
  selector: 'app-card-zoom',
  imports: [ArCardTile, ArStepper, ArButton],
  host: { class: 'ar-overlay-content' },
  templateUrl: './card-zoom.overlay.html',
  styleUrl: './card-zoom.overlay.scss',
})
export class CardZoomOverlay {
  protected readonly data = inject<ArOverlayRef<void, CardZoomData>>(ArOverlayRef).data;
  protected readonly quantity = signal(this.data.quantity?.value ?? 0);
  protected readonly name = computed(() => localizedText(this.data.card.name, contentLocale()) || this.data.card.reference);
  /** The site's card sheet (`/pages/card`, plugin core-altered-cards). */
  protected readonly detailUrl = `${environment.siteUrl.replace(/\/$/, '')}/pages/card?ref=${encodeURIComponent(this.data.card.reference)}&card_lang=${contentLocale()}`;

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
