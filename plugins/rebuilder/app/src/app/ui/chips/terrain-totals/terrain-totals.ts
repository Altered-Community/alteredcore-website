import { Component, computed, input } from '@angular/core';
import { assetUrl } from '../../../core/asset-url';

@Component({
  selector: 'ar-terrain-totals',
  templateUrl: './terrain-totals.html',
  styleUrl: './terrain-totals.scss',
})
export class ArTerrainTotals {
  readonly totals = input.required<{ foret: number; montagne: number; ocean: number }>();
  protected readonly items = computed(() =>
    [
      { key: 'f', label: $localize`:@@ui.terrain.forest:Forêt`, src: assetUrl('assets/icons/terrain-foret.png'), value: this.totals().foret },
      { key: 'm', label: $localize`:@@ui.terrain.mountain:Montagne`, src: assetUrl('assets/icons/terrain-montagne.png'), value: this.totals().montagne },
      { key: 'o', label: $localize`:@@ui.terrain.ocean:Océan`, src: assetUrl('assets/icons/terrain-ocean.png'), value: this.totals().ocean },
    ].map((t) => ({ ...t, title: $localize`:@@ui.terrainTotals.title:Total ${t.label}:terrain: : ${t.value}:value:` })),
  );
}
