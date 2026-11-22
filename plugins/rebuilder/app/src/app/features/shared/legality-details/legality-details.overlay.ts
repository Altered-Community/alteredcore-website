import { Component, inject } from '@angular/core';
import { legalityCheckLabel, legalityRuleLabel, type DeckLegality } from '../../../core/deck-legality';
import { AcIcon } from '../../../ui/icon';
import { AcOverlayRef, AcOverlayService } from '../../../ui/overlay';

export interface LegalityDetailsData {
  format: string;
  legality: DeckLegality;
}

/**
 * « Légalité du deck »: the decks API's verdict, never computed here: its rules passed or failed (`legalityDetail`),
 * else its failed rules, then its problems (`errors`, translated). Nothing known yet (guest deck, not validated): a note.
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
  protected readonly checks = this.ref.data.legality.checks.map((c) => ({
    rule: c.rule,
    ok: c.ok,
    label: legalityCheckLabel(c.rule),
  }));
  protected readonly unknown = this.ref.data.legality.state === 'unknown';
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
