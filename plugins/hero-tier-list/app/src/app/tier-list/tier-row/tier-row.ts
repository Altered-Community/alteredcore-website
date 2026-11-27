import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, viewChild } from '@angular/core';
import { MAX_TIER_NAME, TIER_COLORS, moveHero, moveTier, removeTier, updateTier, type Tier, type TierColor } from '../../core/ranking';
import type { Hero } from '../../core/heroes';
import { TierListStore } from '../../core/tier-list.store';
import { AcIcon } from '../../ui/icon';
import { HeroTile } from '../hero-tile/hero-tile';
import { dragItems } from '../drag/drag-items';
import { HeroDrag } from '../drag/hero-drag';

const COLOR_NAMES: Record<TierColor, string> = {
  red: $localize`:@@tier.color.red:Rouge`,
  orange: $localize`:@@tier.color.orange:Orange`,
  yellow: $localize`:@@tier.color.yellow:Jaune`,
  green: $localize`:@@tier.color.green:Vert`,
  blue: $localize`:@@tier.color.blue:Bleu`,
  violet: $localize`:@@tier.color.violet:Violet`,
  grey: $localize`:@@tier.color.grey:Gris`,
};

/**
 * One tier: its coloured label, then its heroes in a wrapping drop list where they can be dropped at any place and
 * reordered. In edit mode the label gives way to the tier's name, colour, order and delete controls.
 */
@Component({
  selector: 'ac-tier-row',
  imports: [HeroTile, AcIcon],
  templateUrl: './tier-row.html',
  styleUrl: './tier-row.scss',
  host: {
    class: 'ac-tier-row',
    '[class.is-editing]': 'editing()',
    '[style.--ac-tier-row-color]': 'colorVar()',
    '[class.is-over]': 'isOver()',
  },
})
export class TierRow {
  protected readonly store = inject(TierListStore);
  protected readonly drag = inject(HeroDrag);
  private readonly zone = viewChild.required<ElementRef<HTMLElement>>('zone');
  readonly tier = input.required<Tier>();
  readonly heroes = input.required<Hero[]>();
  readonly index = input.required<number>();
  readonly count = input.required<number>();
  readonly editing = input(false);

  protected readonly colors = TIER_COLORS;
  protected readonly colorNames = COLOR_NAMES;
  protected readonly maxName = MAX_TIER_NAME;
  protected readonly colorVar = computed(() => `var(--ac-tier-${this.tier().color})`);
  protected readonly selected = computed(() => this.store.selected());
  protected readonly items = computed(() => dragItems(this.heroes(), this.tier().id, this.drag.dragging(), this.drag.target()));
  /** While the heroes load, one skeleton per saved hero: the tier keeps its final size. */
  protected readonly skeletons = computed(() =>
    this.store.status() === 'loading' ? Array.from({ length: this.tier().heroes.length }, (_, i) => i) : [],
  );
  protected readonly isOver = computed(() => !!this.drag.dragging() && this.drag.target()?.list === this.tier().id);

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      // A row is tracked by its tier id: the id never changes for this component.
      const unregister = this.drag.register({ list: this.tier().id, hit: host, items: this.zone().nativeElement, scrolls: false });
      destroyRef.onDestroy(unregister);
    });
  }

  /** A tap on the label places the hero picked in this tier. */
  protected placeSelected(): void {
    const hero = this.selected();
    if (!hero) return;
    this.store.apply((r) => moveHero(r, hero.id, this.tier().id));
    this.store.select(null);
  }

  protected placeLabel(hero: string): string {
    return $localize`:@@tier.place:Placer ${hero}:hero: en ${this.tier().name}:tier:`;
  }

  protected rename(field: HTMLInputElement): void {
    this.store.apply((r) => updateTier(r, this.tier().id, { name: field.value }));
    // A blank name is not taken: the field shows the name kept.
    if (!field.value.trim()) field.value = this.tier().name;
  }

  protected recolor(color: TierColor): void {
    this.store.apply((r) => updateTier(r, this.tier().id, { color }));
  }

  protected move(delta: -1 | 1): void {
    this.store.apply((r) => moveTier(r, this.tier().id, delta));
  }

  protected remove(): void {
    this.store.apply((r) => removeTier(r, this.tier().id));
  }
}
