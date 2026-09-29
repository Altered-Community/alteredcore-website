import { Component, inject } from '@angular/core';
import { legalityCheckDetail, legalityCheckLabel, legalityRuleLabel, type DeckLegality } from '../../../core/deck-legality';
import { ArIcon } from '../../../ui/icon';
import { ArOverlayRef, ArOverlayService } from '../../../ui/overlay';

export interface LegalityDetailsData {
  format: string;
  legality: DeckLegality;
}

/**
 * « Légalité du deck »: the format's rules, passed or failed (the site's rules modal), or only the failed
 * rules when the decks API gave the verdict; then the API's format errors.
 */
@Component({
  selector: 'app-legality-details',
  imports: [ArIcon],
  host: { class: 'ar-overlay-content' },
  templateUrl: './legality-details.overlay.html',
  styleUrl: './legality-details.overlay.scss',
})
export class LegalityDetailsOverlay {
  protected readonly ref = inject<ArOverlayRef<void, LegalityDetailsData>>(ArOverlayRef);
  protected readonly format = this.ref.data.format;
  protected readonly checks = (this.ref.data.legality.checks ?? []).map((c) => ({
    rule: c.rule,
    ok: c.ok,
    label: legalityCheckLabel(c.rule),
    detail: legalityCheckDetail(c),
  }));
  protected readonly rules = this.ref.data.legality.rules.map(legalityRuleLabel);
  protected readonly errors = this.ref.data.legality.errors;
  protected readonly passed = $localize`:@@deck.legality.passed:Respectée`;
  protected readonly failed = $localize`:@@deck.legality.failed:Non respectée`;
}

export function openLegalityDetails(overlay: ArOverlayService, data: LegalityDetailsData): ArOverlayRef<void, LegalityDetailsData> {
  return overlay.open<LegalityDetailsOverlay, void, LegalityDetailsData>(LegalityDetailsOverlay, {
    title: $localize`:@@deck.legality.title:Légalité du deck`,
    data,
    width: 480,
  });
}
