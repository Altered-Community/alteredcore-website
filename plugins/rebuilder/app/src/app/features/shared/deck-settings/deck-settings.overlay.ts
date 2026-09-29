import { Component, inject, signal } from '@angular/core';
import { BGA_LABEL, DECK_FORMATS } from '../../../core/formats';
import type { DeckFormat, DeckHero } from '../../../core/models';
import { ArButton } from '../../../ui/buttons';
import { ArRadioCard, ArSegmented } from '../../../ui/fields';
import { ArBreakpointService } from '../../../ui/layout.services';
import { ArCardArt } from '../../../ui/metier';
import { ArOverlayRef, ArOverlayService } from '../../../ui/overlay';
import { openHeroPickerStep } from '../hero-picker/hero-picker.overlay';
import { VISIBILITY_OPTIONS } from '../new-deck/new-deck.overlay';

export interface DeckSettings {
  hero: DeckHero | null;
  format: DeckFormat;
  isPublic: boolean;
}

/** ar-deck-settings — « Réglages du deck » (héros, visibilité, format), same content in window and sheet. */
@Component({
  selector: 'ar-deck-settings',
  imports: [ArButton, ArRadioCard, ArSegmented, ArCardArt],
  host: { class: 'ar-overlay-content' },
  templateUrl: './deck-settings.overlay.html',
  styleUrl: './deck-settings.overlay.scss',
})
export class DeckSettingsOverlay {
  protected readonly ref = inject<ArOverlayRef<DeckSettings, DeckSettings>>(ArOverlayRef);
  protected readonly bp = inject(ArBreakpointService);
  protected readonly formats = DECK_FORMATS;
  protected readonly bga = BGA_LABEL;
  protected readonly visibility = VISIBILITY_OPTIONS;

  protected readonly hero = signal<DeckHero | null>(this.ref.data.hero);
  protected readonly format = signal<DeckFormat>(this.ref.data.format);
  protected readonly isPublic = signal<boolean | undefined>(this.ref.data.isPublic);

  changeHero(): void {
    openHeroPickerStep(this.ref, this.hero()).afterClosed.subscribe((h) => {
      if (h) this.hero.set(h);
    });
  }

  save(): void {
    this.ref.close({ hero: this.hero(), format: this.format(), isPublic: !!this.isPublic() });
  }
}

export function openDeckSettings(overlay: ArOverlayService, current: DeckSettings): ArOverlayRef<DeckSettings, DeckSettings> {
  return overlay.open<DeckSettingsOverlay, DeckSettings, DeckSettings>(DeckSettingsOverlay, {
    title: 'Réglages du deck',
    data: current,
    width: 520,
  });
}
