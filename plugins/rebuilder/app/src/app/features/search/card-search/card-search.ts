import { Component, DestroyRef, ElementRef, Injector, afterNextRender, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { uiLocale } from '../../../core/i18n';
import { ORDER_OPTIONS, activeFilterCount, toUniquesQuery, type CardSource, type SearchFilters } from '../../../core/card-filters';
import { UniquesApiService } from '../../../core/uniques-api.service';
import type { CardOrder, DeckFormat } from '../../../core/models';
import { AcButton, AcIconButton } from '../../../ui/buttons';
import { AcCount, AcFilterBar } from '../../../ui/chips';
import { AcDrawerHandle, AcDrawerState, AcDrawerTab } from '../../../ui/containers';
import { storedFlag } from '../../../core/stored-flag';
import { AcInput, AcSegmented, AcSelect } from '../../../ui/fields';
import { AcBreakpointService } from '../../../ui/layout.services';
import { AcStickyOffset } from '../../../ui/sticky-offset';
import { AcTabs } from '../../../ui/nav';
import { AcOverlayService } from '../../../ui/overlay';
import { CardSearchStore } from '../card-search.store';
import { openEffectEditor } from '../effect-editor/effect-editor.overlay';
import { FiltersPanel } from '../filters-panel/filters-panel';
import { openFiltersSheet } from '../filters-sheet/filters-sheet.overlay';
import { SearchResults } from '../search-results/search-results';

export interface CardSourceTab {
  id: CardSource;
  label: string;
  /** Label in the compact tab row. */
  short?: string;
}

export const CARD_SOURCES: CardSourceTab[] = [
  { id: 'all', label: $localize`:@@search.source.all:Toutes les cartes`, short: $localize`:@@search.source.allShort:Toutes` },
  { id: 'uniques', label: $localize`:@@search.source.uniques:Uniques` },
  { id: 'favorites', label: $localize`:@@search.source.favorites:Favoris` },
  { id: 'collection', label: $localize`:@@search.source.collection:Collection physique`, short: $localize`:@@search.source.collectionShort:Collection` },
  { id: 'owned', label: $localize`:@@search.source.owned:Propriété numérique`, short: $localize`:@@search.source.ownedShort:Numérique` },
];

/** Compact screens: tabs in the row, the others under « Plus ». */
const COMPACT_SOURCE_TABS = 4;

/** Filters typed into a text field: a change is applied once the typing pauses. */
const TEXT_FILTERS = ['q', 'mainCost', 'recallCost', 'forestPower', 'mountainPower', 'oceanPower'] as const satisfies readonly (keyof SearchFilters)[];

/**
 * Card search shared by the deck editor and the card browser: source tabs (`?source=`), filters
 * (aside ≥ 1200 px, sheet below), active-filter chips, sort, grid / list results.
 * The host provides `CardSearchStore`; `faction` locks the search to one faction (the deck's hero).
 */
@Component({
  selector: 'app-card-search',
  imports: [AcTabs, AcSegmented, AcSelect, AcInput, AcIconButton, AcButton, AcCount, AcFilterBar, AcDrawerHandle, AcDrawerTab, AcStickyOffset, FiltersPanel, SearchResults],
  host: { '[class.compact]': 'bp.compact()' },
  templateUrl: './card-search.html',
  styleUrl: './card-search.scss',
})
export class CardSearch {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly overlay = inject(AcOverlayService);
  private readonly uniquesApi = inject(UniquesApiService);
  protected readonly bp = inject(AcBreakpointService);
  protected readonly search = inject(CardSearchStore);
  private readonly injector = inject(Injector);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  readonly sources = input<CardSourceTab[]>(CARD_SOURCES);
  protected readonly compactSourceTabs = COMPACT_SOURCE_TABS;
  readonly faction = input<string | null>(null);
  /** Editor: the deck's format (Favoris show the cards it allows by default). */
  readonly format = input<DeckFormat | null>(null);
  /** False while the host is still loading what `faction` depends on. */
  readonly ready = input(true);
  /** Card browser: faction filter, no quantity controls on the cards. */
  readonly browse = input(false);

  protected readonly source = toSignal(
    this.route.queryParamMap.pipe(map((q) => (q.get('source') as CardSource) || 'all')),
    { initialValue: 'all' as CardSource },
  );

  protected readonly orderOptions = ORDER_OPTIONS.map((o) => ({ value: o.value, label: o.label }));
  protected readonly compactOrderOptions = ORDER_OPTIONS.map((o) => ({ value: o.value, label: $localize`:@@search.card.sortOption:Tri : ${o.label}:order:` }));
  protected readonly layoutOptions = [
    { value: 'grid' as const, icon: 'layout-grid' as const, ariaLabel: $localize`:@@search.card.grid:Grille` },
    { value: 'list' as const, icon: 'list' as const, ariaLabel: $localize`:@@search.card.list:Liste` },
  ];
  protected readonly labels = {
    showList: $localize`:@@search.card.showList:Afficher en liste`,
    showGrid: $localize`:@@search.card.showGrid:Afficher en grille`,
  };
  protected readonly resultsLayout = signal<'grid' | 'list'>('grid');
  protected readonly condensed = signal(false);

  /** Desktop filters apply live; the draft mirrors the store and debounces text inputs. */
  protected readonly draft = signal<SearchFilters>(this.search.filters());
  private applyTimer?: ReturnType<typeof setTimeout>;

  protected readonly activeCount = computed(() => activeFilterCount(this.search.filters(), this.search.source()));
  protected readonly filtersLabel = computed(() => $localize`:@@search.card.filtersActive:Filtres, ${this.activeCount()}:count: actifs`);
  /** Wide screens: the filters panel can be hidden (a tab on the page edge brings it back), remembered in this browser. */
  protected readonly filtersOpen = storedFlag('rebuilder.search.filtersOpen', true);
  protected readonly showFiltersLabel = computed(() =>
    this.activeCount()
      ? $localize`:@@search.card.showFiltersActive:Afficher les filtres, ${this.activeCount()}:count: actifs`
      : $localize`:@@search.card.showFilters:Afficher les filtres`,
  );
  /** Hides or shows the filters, with their motion; the focus moves to the control that undoes it. */
  protected readonly filters = new AcDrawerState(this.filtersOpen, 'start', (open) =>
    afterNextRender(() => this.el.querySelector<HTMLElement>(open ? '.filters-drawer .ac-drawer-handle' : '.filters-tab')?.focus(), {
      injector: this.injector,
    }),
  );
  protected readonly sourceLabel = computed(() => this.sources().find((s) => s.id === this.search.source())?.label ?? '');
  protected readonly orderLabel = computed(() => ORDER_OPTIONS.find((o) => o.value === this.search.filters().order)?.label ?? '');
  /** The Uniques search API returns its own order, with no sort parameter. */
  // The Uniques search API and the account lists (favorites, collection, ownership) have their own order.
  protected readonly sortable = computed(() => this.search.source() === 'all');
  protected readonly totalLabel = computed(() => {
    const t = this.search.total();
    if (t === null) return '…';
    const n = t.toLocaleString(uiLocale());
    if (t === 0) return $localize`:@@search.card.totalZero:0 carte`;
    return t > 1 ? $localize`:@@search.card.total:${n}:count: cartes` : $localize`:@@search.card.totalOne:1 carte`;
  });

  constructor() {
    effect(() => {
      const source = this.source();
      const faction = this.faction();
      const format = this.format();
      if (!this.ready()) return;
      untracked(() => {
        if (!this.search.configured() || source !== this.search.source() || faction !== this.search.faction() || format !== this.search.format() || (this.search.page() === 0 && !this.search.loading())) {
          this.search.configure(source, faction, format);
          this.draft.set(this.search.filters());
        }
      });
    });

    effect(() => {
      if (this.source() !== 'uniques') return;
      untracked(() => this.prefetchAbilities());
    });

    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    let measuring = 0;
    const onScroll = () => {
      const next = window.scrollY > 170;
      if (next !== this.condensed()) this.condensed.set(next);
      // The desktop filters panel ends at the bottom of the window: its height leaves out how far it still sits below
      // its sticky position (whatever is above it on the page), set on the host, no change detection.
      // Read once a frame at most, and only where the panel exists (from 1200 px).
      if (measuring || this.bp.compact()) return;
      measuring = requestAnimationFrame(() => {
        measuring = 0;
        const drawer = host.querySelector<HTMLElement>('.filters-drawer');
        if (!drawer) return;
        const below = drawer.getBoundingClientRect().top - (parseFloat(getComputedStyle(drawer).top) || 0);
        host.style.setProperty('--app-filters-offset', `${Math.max(0, Math.round(below))}px`);
      });
    };
    onScroll();
    // Measured again once the panel is on the page: at first, and each time it is shown again from its tab.
    effect(() => {
      if (this.filtersOpen()) afterNextRender(onScroll, { injector: this.injector });
    });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(measuring);
      clearTimeout(this.applyTimer);
    });
  }

  /** The effect editor needs the vocabularies (one `/api/v2/effects` call); fetch them while the user reads the uniques. */
  private prefetchAbilities(): void {
    const run = () => this.uniquesApi.abilities('triggers').subscribe({ error: () => undefined });
    if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 2000 });
    else setTimeout(run, 300);
  }

  protected setSource(id: string): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { source: id === 'all' ? null : id }, replaceUrl: true });
  }

  protected onDraft(next: SearchFilters): void {
    const prev = this.draft();
    this.draft.set(next);
    clearTimeout(this.applyTimer);
    // Free-text fields (name, costs, powers) wait for the typing to pause.
    const textChanged = TEXT_FILTERS.some((key) => prev[key] !== next[key]);
    if (textChanged) this.applyTimer = setTimeout(() => this.search.apply(this.draft()), 350);
    else this.search.apply(next);
  }

  protected applyNow(): void {
    clearTimeout(this.applyTimer);
    this.search.apply(this.draft());
    window.scrollTo({ top: 0 });
  }

  protected resetFilters(): void {
    this.search.reset();
    this.draft.set(this.search.filters());
  }

  protected removeChip(id: string): void {
    this.search.removeChip(id);
    this.draft.set(this.search.filters());
  }

  protected clearAll(): void {
    this.search.clearAll();
    this.draft.set(this.search.filters());
  }

  protected setOrder(order: string): void {
    this.search.patch({ order: order as CardOrder });
    this.draft.set(this.search.filters());
  }

  protected setQuery(q: string): void {
    this.draft.update((d) => ({ ...d, q }));
    clearTimeout(this.applyTimer);
    this.applyTimer = setTimeout(() => this.search.apply(this.draft()), 350);
  }

  protected openFilters(): void {
    openFiltersSheet(this.overlay, {
      source: this.search.source(),
      faction: this.search.faction(),
      format: this.search.format(),
      filters: this.search.filters(),
      factionFilter: this.browse(),
    }).afterClosed.subscribe((f) => {
      if (!f) return;
      this.search.apply(f);
      this.draft.set(f);
      window.scrollTo({ top: 0 });
    });
  }

  protected editEffect(index: number): void {
    const effect = this.draft().effects[index];
    if (!effect) return;
    openEffectEditor(this.overlay, { effect, index, query: toUniquesQuery(this.draft(), this.search.faction()) }).afterClosed.subscribe((next) => {
      const effects = next
        ? this.draft().effects.map((e, i) => (i === index ? next : e))
        : this.draft().effects.filter((e, i) => i !== index || e.triggers.length || e.conditions.length || e.effects.length);
      this.onDraft({ ...this.draft(), effects });
    });
  }

  protected scrollTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
