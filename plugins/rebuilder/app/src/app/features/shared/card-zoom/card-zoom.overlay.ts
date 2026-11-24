import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { contentLocale } from '../../../core/locale';
import type { Card } from '../../../core/models';
import { localizedText } from '../../../core/models';
import { AcButton, AcIconButton, AcStepper } from '../../../ui/buttons';
import { AcCardTile } from '../../../ui/metier';
import { AcOverlayRef, AcOverlayService } from '../../../ui/overlay';
import { openAltArtPicker, type AltArtPickerData } from '../../editor/alt-art-picker/alt-art-picker.overlay';

export interface CardZoomData {
  card: Card;
  /**
   * Editor: copies in the deck, changed from the window (as the site's deck builder lightbox); card browser: copies in the
   * physical collection (`in: 'collection'`).
   */
  quantity?: { value: number; max: number; change: (quantity: number) => void; in?: 'deck' | 'collection' };
  /** Editor, a card with several illustrations: « Choisir les illustrations » opens its brush in place of this window. */
  illustrations?: AltArtPickerData;
  /**
   * The cards around this one, in the order the screen shows them: « Précédente » / « Suivante » and the ← / → keys
   * walk through them. `controls` gives the editor controls (copies, brush) of the card reached.
   */
  siblings?: {
    cards: readonly Card[];
    controls?: (card: Card) => Pick<CardZoomData, 'quantity' | 'illustrations'>;
  };
}

/** A navigation arrow and its gap, in px (the largest control, touch density). */
const ARROW_WIDTH = 56;

/** A card shown large, with a link to its sheet on the site (the site's card lightbox); in the editor, its copies. */
@Component({
  selector: 'app-card-zoom',
  imports: [AcCardTile, AcStepper, AcButton, AcIconButton],
  host: { class: 'ac-overlay-content', '(document:keydown)': 'onKey($event)' },
  templateUrl: './card-zoom.overlay.html',
  styleUrl: './card-zoom.overlay.scss',
})
export class CardZoomOverlay {
  private readonly ref = inject<AcOverlayRef<void, CardZoomData>>(AcOverlayRef);
  private readonly overlay = inject(AcOverlayService);
  private readonly initial = this.ref.data;
  private readonly cards = this.initial.siblings?.cards ?? [];
  /** Position of the card shown among `cards`; -1 when the card is not in the list (no navigation). */
  protected readonly index = signal(this.cards.findIndex((c) => c.reference === this.initial.card.reference));
  protected readonly navigable = this.index() >= 0 && this.cards.length > 1;
  protected readonly total = this.cards.length;
  protected readonly data = computed<CardZoomData>(() => {
    const i = this.index();
    if (i < 0) return this.initial;
    const card = this.cards[i];
    if (card.reference === this.initial.card.reference) return this.initial;
    return { card, ...this.initial.siblings?.controls?.(card) };
  });
  protected readonly quantity = linkedSignal(() => this.data().quantity?.value ?? 0);
  protected readonly name = computed(() => localizedText(this.data().card.name, contentLocale()) || this.data().card.reference);
  protected readonly labels = {
    previous: $localize`:@@cardZoom.previous:Carte précédente`,
    next: $localize`:@@cardZoom.next:Carte suivante`,
  };
  /** The site's card sheet (`/pages/card`, plugin core-altered-cards). */
  protected readonly detailUrl = computed(
    () => `${environment.siteUrl.replace(/\/$/, '')}/pages/card?ref=${encodeURIComponent(this.data().card.reference)}&card_lang=${contentLocale()}`,
  );

  protected setQuantity(n: number): void {
    this.quantity.set(n);
    this.data().quantity?.change(n);
  }

  /** Steps through the cards, wrapping around at both ends. */
  protected go(step: 1 | -1): void {
    if (!this.navigable) return;
    this.index.update((i) => (i + step + this.total) % this.total);
  }

  protected onKey(event: KeyboardEvent): void {
    if (!this.navigable || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const target = event.composedPath()[0];
    if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
    event.preventDefault();
    this.go(event.key === 'ArrowRight' ? 1 : -1);
  }

  /** The brush is a window of its own (the zoom has no frame for it): the zoom closes first, never two windows. */
  protected chooseIllustrations(): void {
    const data = this.data().illustrations;
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
    // 360 px of card; with its siblings, the arrows beside it take 2 × (button + gap) more.
    width: data.siblings && data.siblings.cards.length > 1 ? 360 + 2 * ARROW_WIDTH : 360,
    bare: true,
  });
}
