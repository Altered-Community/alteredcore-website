import { Component, inject } from '@angular/core';
import { legalityCheckDetail, legalityCheckLabel, legalityRuleLabel, type DeckLegality } from '../../../core/deck-legality';
import { AcIcon } from '../../../ui/icon';
import { AcOverlayRef, AcOverlayService } from '../../../ui/overlay';

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
  imports: [AcIcon],
  host: { class: 'ac-overlay-content' },
  templateUrl: './legality-details.overlay.html',
  styleUrl: './legality-details.overlay.scss',
})
export class LegalityDetailsOverlay {
  protected readonly ref = inject<AcOverlayRef<void, LegalityDetailsData>>(AcOverlayRef);
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

export function openLegalityDetails(overlay: AcOverlayService, data: LegalityDetailsData): AcOverlayRef<void, LegalityDetailsData> {
  return overlay.open<LegalityDetailsOverlay, void, LegalityDetailsData>(LegalityDetailsOverlay, {
    title: $localize`:@@deck.legality.title:Légalité du deck`,
    data,
    width: 480,
  });
}
