import { Component, inject, signal } from '@angular/core';
import type { DrawnCard } from '../../../core/test-hand';
import { AcButton } from '../../../ui/buttons';
import { AcCardTile } from '../../../ui/metier';
import { AcOverlayRef, AcOverlayService } from '../../../ui/overlay';

export interface PlayZoneData {
  cards: DrawnCard[];
  /** Discard pile: « Remettre en main » on each card. */
  returnToHand?: (id: number) => void;
}

/** Game mode: the cards of a zone (mana, discard pile), as the site's card list window. */
@Component({
  selector: 'app-play-zone',
  imports: [AcCardTile, AcButton],
  host: { class: 'ac-overlay-content' },
  templateUrl: './play-zone.overlay.html',
  styleUrl: './play-zone.overlay.scss',
})
export class PlayZoneOverlay {
  private readonly data = inject<AcOverlayRef<void, PlayZoneData>>(AcOverlayRef).data;
  protected readonly cards = signal(this.data.cards);
  protected readonly canReturn = !!this.data.returnToHand;

  protected returnToHand(id: number): void {
    this.data.returnToHand?.(id);
    this.cards.update((cards) => cards.filter((c) => c.id !== id));
  }
}

export function openPlayZone(overlay: AcOverlayService, title: string, data: PlayZoneData): AcOverlayRef<void, PlayZoneData> {
  return overlay.open<PlayZoneOverlay, void, PlayZoneData>(PlayZoneOverlay, { title, data, width: 640 });
}
