import { Component, inject, signal } from '@angular/core';
import { BGA_LABEL, bgaTag, heroOnBga, visibleFormats, type FormatInfo } from '../../../core/formats';
import type { DeckFormat, DeckHero } from '../../../core/models';
import { ArButton } from '../../../ui/buttons';
import { ArInput, ArRadioCard, ArSegmented, ArTextarea } from '../../../ui/fields';
import { ArBreakpointService } from '../../../ui/layout.services';
import { ArCardArt } from '../../../ui/metier';
import { ArOverlayRef, ArOverlayService } from '../../../ui/overlay';
import { openHeroPickerStep } from '../hero-picker/hero-picker.overlay';
import { VISIBILITY_OPTIONS } from '../new-deck/new-deck.overlay';

export interface DeckSettings {
  name: string;
  description: string;
  hero: DeckHero | null;
  format: DeckFormat;
  isPublic: boolean;
}

/**
 * ar-deck-settings — « Réglages du deck » (nom, héros, visibilité, description, format), same content in
 * window and sheet: the only place to rename a deck in the compact layout.
 */
@Component({
  selector: 'ar-deck-settings',
  imports: [ArButton, ArInput, ArRadioCard, ArSegmented, ArTextarea, ArCardArt],
  host: { class: 'ar-overlay-content' },
  templateUrl: './deck-settings.overlay.html',
  styleUrl: './deck-settings.overlay.scss',
})
export class DeckSettingsOverlay {
  protected readonly ref = inject<ArOverlayRef<DeckSettings, DeckSettings>>(ArOverlayRef);
  protected readonly bp = inject(ArBreakpointService);
  protected readonly formats = visibleFormats();
  protected readonly bga = BGA_LABEL;
  /** BGA tag of a format, « Héros indispo. BGA » when the chosen hero is not on Board Game Arena (as on the site). */
  protected tagOf(f: FormatInfo): { label: string; tone: 'green' | 'violet' | 'red' } {
    const hero = this.hero();
    return bgaTag(f, !!hero && !heroOnBga([hero.reference]));
  }
  protected readonly visibility = VISIBILITY_OPTIONS;
  protected readonly noHero = $localize`:@@shared.deckSettings.noHero:Aucun héros`;

  protected readonly name = signal(this.ref.data.name);
  protected readonly description = signal(this.ref.data.description);
  protected readonly hero = signal<DeckHero | null>(this.ref.data.hero);
  protected readonly format = signal<DeckFormat>(this.ref.data.format);
  protected readonly isPublic = signal<boolean | undefined>(this.ref.data.isPublic);

  changeHero(): void {
    openHeroPickerStep(this.ref, this.hero()).afterClosed.subscribe((h) => {
      if (h) this.hero.set(h);
    });
  }

  save(): void {
    const name = this.name().trim();
    if (!name) return;
    this.ref.close({ name, description: this.description().trim(), hero: this.hero(), format: this.format(), isPublic: !!this.isPublic() });
  }
}

export function openDeckSettings(overlay: ArOverlayService, current: DeckSettings): ArOverlayRef<DeckSettings, DeckSettings> {
  return overlay.open<DeckSettingsOverlay, DeckSettings, DeckSettings>(DeckSettingsOverlay, {
    title: $localize`:@@shared.deckSettings.title:Réglages du deck`,
    data: current,
    width: 520,
  });
}
