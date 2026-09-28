import { ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, computed, input, model, viewChild } from '@angular/core';
import { ArHeroTile } from '../hero-tile/hero-tile';
import { scrollIntoViewInline } from '../scroll';

export interface ArHeroOption {
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
  selector: 'ar-hero-selector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArHeroTile],
  host: {
    '[class]': "'layout-' + layout()",
    '[style.--ar-hero-cols]': 'columns()',
  },
  templateUrl: './hero-selector.html',
  styleUrl: './hero-selector.scss',
})
export class ArHeroSelector {
  /** All heroes (filtered here by `faction`); `null` while loading. */
  readonly heroes = input<readonly ArHeroOption[] | null>(null);
  readonly faction = input('AX');
  readonly selected = model<ArHeroOption | null>(null);
  readonly layout = input<'grid' | 'carousel'>('grid');
  /** Grid columns (`layout="grid"`); also the number of loading skeletons. */
  readonly columns = input(4);
  readonly error = input(false);
  readonly ariaLabel = input('Héros');
  /** Id of the tile group, referenced by `ar-faction-tabs [controls]`. */
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

  protected pick(h: ArHeroOption): void {
    this.selected.set(h);
  }
}
