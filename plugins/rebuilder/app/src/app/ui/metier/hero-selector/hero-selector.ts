import { Component, ElementRef, afterRenderEffect, computed, input, model, viewChild } from '@angular/core';
import { AcHeroTile } from '../hero-tile/hero-tile';
import { scrollIntoViewInline } from '../scroll';

export interface AcHeroOption {
  reference: string;
  name: string;
  faction: string;
  unavailableOnBga?: boolean;
}

/**
 * Heroes of one faction: grid (`columns` equal columns) or horizontal carousel (112 px tiles, scroll-snap,
 * selection kept in view). `heroes = null` shows skeletons, `error` the connection message. Used by
 * « Nouveau deck » and « Choisir un héros ».
 */
@Component({
  selector: 'ac-hero-selector',
  imports: [AcHeroTile],
  host: {
    '[class]': "'layout-' + layout()",
    '[style.--ac-hero-cols]': 'columns()',
  },
  templateUrl: './hero-selector.html',
  styleUrl: './hero-selector.scss',
})
export class AcHeroSelector {
  /** All heroes (filtered here by `faction`); `null` while loading. */
  readonly heroes = input<readonly AcHeroOption[] | null>(null);
  readonly faction = input('AX');
  readonly selected = model<AcHeroOption | null>(null);
  readonly layout = input<'grid' | 'carousel'>('grid');
  /** Grid columns (`layout="grid"`); also the number of loading skeletons. */
  readonly columns = input(4);
  readonly error = input(false);
  readonly ariaLabel = input('Héros');
  /** Id of the tile group, referenced by `ac-faction-tabs [controls]`. */
  readonly panelId = input('');

  protected readonly visible = computed(() => (this.heroes() ?? []).filter((h) => h.faction === this.faction()));
  protected readonly skeletons = computed(() => Array.from({ length: this.layout() === 'carousel' ? 3 : this.columns() }, (_, i) => i));
  private readonly track = viewChild<ElementRef<HTMLElement>>('track');

  constructor() {
    // Carousel: bring the selected tile into view (on open, faction change, selection).
    afterRenderEffect(() => {
      const track = this.track()?.nativeElement;
      const ref = this.selected()?.reference;
      this.visible();
      if (!track || this.layout() !== 'carousel') return;
      const i = ref ? this.visible().findIndex((h) => h.reference === ref) : -1;
      const tile = track.children.item(i) as HTMLElement | null;
      if (tile) scrollIntoViewInline(tile);
    });
  }

  protected pick(h: AcHeroOption): void {
    this.selected.set(h);
  }
}
