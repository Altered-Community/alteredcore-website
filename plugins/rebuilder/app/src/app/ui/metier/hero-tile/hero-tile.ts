import { Component, input, output } from '@angular/core';
import { ArIcon } from '../../icon';
import { ArCardArt } from '../card-art/card-art';

/** Hero visual + name. Fills its container: a grid cell, or a fixed-width carousel slot (`size="sm"`). */
@Component({
  selector: 'ar-hero-tile',
  imports: [ArCardArt, ArIcon],
  host: { '[class.sm]': "size() === 'sm'" },
  templateUrl: './hero-tile.html',
  styleUrl: './hero-tile.scss',
})
export class ArHeroTile {
  readonly hero = input.required<{ reference: string; name: string; faction: string }>();
  readonly selected = input(false);
  readonly unavailableOnBga = input(false);
  /** `sm`: 13 px name, for fixed-width carousel slots. */
  readonly size = input<'sm' | 'md'>('md');
  readonly choose = output<void>();
}
