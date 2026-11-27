import { Component, computed, input, linkedSignal } from '@angular/core';
import { FACTION_NAMES, FACTION_TOKENS, heroArtSources, type Hero } from '../../core/heroes';

/**
 * A hero's full art (CDN, frameless) cropped on the face, framed in its faction's colour, its name over the bottom
 * of the art. Shown on the board, in the pool, as the drag preview and in the action bar. The host is not
 * interactive: the board puts it inside its own button.
 */
@Component({
  selector: 'ac-hero-tile',
  templateUrl: './hero-tile.html',
  styleUrl: './hero-tile.scss',
  host: {
    class: 'ac-hero-tile',
    '[style.--ac-hero-tile-faction]': 'factionColor()',
    '[attr.title]': 'tooltip()',
  },
})
export class HeroTile {
  readonly hero = input.required<Hero>();
  /** Hides the name strip (small thumbnails). */
  readonly showName = input(true);

  protected readonly sources = computed(() => heroArtSources(this.hero()));
  /** Index of the source shown: the next one after a load error, the placeholder once they all failed. */
  protected readonly sourceIndex = linkedSignal({ source: this.sources, computation: () => 0 });
  protected readonly src = computed(() => this.sources()[this.sourceIndex()] ?? null);
  protected readonly loaded = linkedSignal({ source: this.src, computation: () => false });
  protected readonly factionColor = computed(() => `var(${FACTION_TOKENS[this.hero().faction]})`);
  protected readonly tooltip = computed(() => `${this.hero().name} · ${FACTION_NAMES[this.hero().faction]}`);

  protected onError(): void {
    this.sourceIndex.update((i) => i + 1);
  }
}
