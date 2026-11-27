import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { FACTIONS, FACTION_NAMES, FACTION_TOKENS, HERO_SET_NAMES, type Faction } from '../../core/heroes';
import { TierListStore } from '../../core/tier-list.store';
import { AcIcon } from '../../ui/icon';
import { dragItems } from '../drag/drag-items';
import { HeroDrag, POOL_LIST } from '../drag/hero-drag';
import { HeroTile } from '../hero-tile/hero-tile';

/**
 * The heroes not ranked yet, in faction then set order, with a search and faction / set filters. A drop list too:
 * a hero dropped here leaves its tier. The filters only narrow this list, never the board.
 */
@Component({
  selector: 'ac-hero-pool',
  imports: [HeroTile, AcIcon],
  host: {
    '[class.is-over]': 'isOver()',
  },
  templateUrl: './hero-pool.html',
  styleUrl: './hero-pool.scss',
})
export class HeroPool {
  protected readonly store = inject(TierListStore);
  protected readonly drag = inject(HeroDrag);
  protected readonly listId = POOL_LIST;
  private readonly zone = viewChild.required<ElementRef<HTMLElement>>('zone');
  protected readonly factions = FACTIONS;
  protected readonly factionNames = FACTION_NAMES;
  protected readonly factionTokens = FACTION_TOKENS;

  protected readonly query = signal('');
  protected readonly factionFilter = signal<ReadonlySet<Faction>>(new Set());
  /** One set at a time (`''`: all). */
  protected readonly setFilter = signal('');

  protected readonly skeletons = computed(() => Array.from({ length: this.store.poolSkeletons() }, (_, i) => i));

  /** Sets that brought heroes, in release order. */
  protected readonly sets = computed(() => {
    const present = new Set(this.store.heroes().map((h) => h.set));
    return Object.keys(HERO_SET_NAMES)
      .filter((s) => present.has(s))
      .map((s) => ({ id: s, name: HERO_SET_NAMES[s] }));
  });

  protected readonly visible = computed(() => {
    const q = normalize(this.query());
    const factions = this.factionFilter();
    const set = this.setFilter();
    return this.store
      .pool()
      .filter((h) => (!factions.size || factions.has(h.faction)) && (!set || h.set === set) && (!q || normalize(h.name).includes(q)));
  });

  /** The pool never shows a landing slot: its order is the natural one. */
  protected readonly items = computed(() => dragItems(this.visible(), POOL_LIST, this.drag.dragging(), null));
  /** A ranked hero dragged over the pool: dropping it here unranks it. */
  protected readonly isOver = computed(() => {
    const d = this.drag.dragging();
    return !!d && d.from !== POOL_LIST && this.drag.target()?.list === POOL_LIST;
  });

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const items = this.zone().nativeElement;
      // Next to the board (wide screens), the list scrolls on its own; below it, the page does.
      const unregister = this.drag.register({
        list: POOL_LIST,
        hit: host,
        items,
        get scrolls() {
          return items.scrollHeight > items.clientHeight;
        },
      });
      destroyRef.onDestroy(unregister);
    });
  }

  protected readonly filtered = computed(() => !!this.query().trim() || this.factionFilter().size > 0 || !!this.setFilter());

  protected toggleFaction(f: Faction): void {
    this.factionFilter.update((s) => toggle(s, f));
  }

  protected clearFilters(): void {
    this.query.set('');
    this.factionFilter.set(new Set());
    this.setFilter.set('');
  }
}

function toggle<T>(set: ReadonlySet<T>, value: T): ReadonlySet<T> {
  const next = new Set(set);
  if (!next.delete(value)) next.add(value);
  return next;
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}
