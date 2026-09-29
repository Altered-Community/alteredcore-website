import { Component, computed, input } from '@angular/core';
import { assetUrl } from '../../../core/asset-url';
import { deckComposition, deckStats } from '../../../core/deck-view';
import type { HydratedLine } from '../../../core/models';
import { ArCardSurface } from '../../../ui/containers';
import { ArCostChart, ArStatBars, type ArStatBar } from '../../../ui/metier';

/** « Stats » tab of the deck page: cost curves, cards per type, average powers (the site's Stats tab). */
@Component({
  selector: 'app-deck-stats-view',
  imports: [ArCardSurface, ArCostChart, ArStatBars],
  templateUrl: './deck-stats-view.html',
  styleUrl: './deck-stats-view.scss',
})
export class DeckStatsView {
  readonly lines = input.required<HydratedLine[]>();
  protected readonly stats = computed(() => deckStats(this.lines()));
  private readonly composition = computed(() => deckComposition(this.lines()));
  protected readonly types = computed<ArStatBar[]>(() => this.composition().types.map((t) => ({ key: t.id, label: t.label, value: t.count })));
  protected readonly powers = computed<ArStatBar[]>(() => {
    const p = this.composition().powers;
    return [
      { key: 'foret', tone: 'foret', label: $localize`:@@ui.terrain.forest:Forêt`, iconSrc: assetUrl('assets/icons/terrain-foret.png'), value: p.foret },
      { key: 'montagne', tone: 'montagne', label: $localize`:@@ui.terrain.mountain:Montagne`, iconSrc: assetUrl('assets/icons/terrain-montagne.png'), value: p.montagne },
      { key: 'ocean', tone: 'ocean', label: $localize`:@@ui.terrain.ocean:Océan`, iconSrc: assetUrl('assets/icons/terrain-ocean.png'), value: p.ocean },
    ];
  });
}
