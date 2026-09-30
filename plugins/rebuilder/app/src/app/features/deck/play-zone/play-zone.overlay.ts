import { Component, inject, signal } from '@angular/core';
import type { DrawnCard } from '../../../core/test-hand';
import { ArButton } from '../../../ui/buttons';
import { ArCardTile } from '../../../ui/metier';
import { ArOverlayRef, ArOverlayService } from '../../../ui/overlay';

export interface PlayZoneData {
  cards: DrawnCard[];
  /** Discard pile: « Remettre en main » on each card. */
  returnToHand?: (id: number) => void;
}

/** Game mode: the cards of a zone (mana, discard pile), as the site's card list window. */
@Component({
  selector: 'app-play-zone',
  imports: [ArCardTile, ArButton],
  host: { class: 'ar-overlay-content' },
  templateUrl: './play-zone.overlay.html',
  styleUrl: './play-zone.overlay.scss',
})
export class PlayZoneOverlay {
  private readonly data = inject<ArOverlayRef<void, PlayZoneData>>(ArOverlayRef).data;
  protected readonly cards = signal(this.data.cards);
  protected readonly canReturn = !!this.data.returnToHand;

  protected returnToHand(id: number): void {
    this.data.returnToHand?.(id);
    this.cards.update((cards) => cards.filter((c) => c.id !== id));
  }
}

export function openPlayZone(overlay: ArOverlayService, title: string, data: PlayZoneData): ArOverlayRef<void, PlayZoneData> {
  return overlay.open<PlayZoneOverlay, void, PlayZoneData>(PlayZoneOverlay, { title, data, width: 640 });
}
