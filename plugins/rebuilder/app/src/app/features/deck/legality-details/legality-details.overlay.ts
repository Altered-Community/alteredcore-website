import { Component, inject } from '@angular/core';
import { legalityRuleLabel, type DeckLegality } from '../../../core/deck-legality';
import { ArOverlayRef, ArOverlayService } from '../../../ui/overlay';

export interface LegalityDetailsData {
  format: string;
  legality: DeckLegality;
}

/** « Légalité du deck »: format, failed rules and format errors of an illegal deck (the site's modal). */
@Component({
  selector: 'app-legality-details',
  host: { class: 'ar-overlay-content' },
  templateUrl: './legality-details.overlay.html',
  styleUrl: './legality-details.overlay.scss',
})
export class LegalityDetailsOverlay {
  protected readonly ref = inject<ArOverlayRef<void, LegalityDetailsData>>(ArOverlayRef);
  protected readonly format = this.ref.data.format;
  protected readonly rules = this.ref.data.legality.rules.map(legalityRuleLabel);
  protected readonly errors = this.ref.data.legality.errors;
}

export function openLegalityDetails(overlay: ArOverlayService, data: LegalityDetailsData): ArOverlayRef<void, LegalityDetailsData> {
  return overlay.open<LegalityDetailsOverlay, void, LegalityDetailsData>(LegalityDetailsOverlay, {
    title: $localize`:@@deck.legality.title:Légalité du deck`,
    data,
    width: 480,
  });
}
