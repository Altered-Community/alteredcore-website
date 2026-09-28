import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'ar-terrain-totals',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './terrain-totals.html',
  styleUrl: './terrain-totals.scss',
})
export class ArTerrainTotals {
  readonly totals = input.required<{ foret: number; montagne: number; ocean: number }>();
  protected readonly items = computed(() => [
    { key: 'f', label: 'Forêt', src: 'assets/icons/terrain-foret.png', value: this.totals().foret },
    { key: 'm', label: 'Montagne', src: 'assets/icons/terrain-montagne.png', value: this.totals().montagne },
    { key: 'o', label: 'Océan', src: 'assets/icons/terrain-ocean.png', value: this.totals().ocean },
  ]);
}
