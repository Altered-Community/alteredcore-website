import { Component, DestroyRef, ElementRef, Injector, afterNextRender, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { uiLocale } from '../../../core/i18n';
import { ORDER_OPTIONS, activeFilterCount, defaultFilters, effectAt, hasInvalidNumericFilters, toSearchParams, withEditedEffect, type CardSource, type SearchFilters } from '../../../core/card-filters';
import { UniquesApiService, type EffectSlot } from '../../../core/uniques-api.service';
import { filtersFromParams, filtersToParams, sourceFromParams } from '../../../core/search-url';
import type { CardOrder, DeckFormat } from '../../../core/models';
import { AcButton, AcIconButton } from '../../../ui/buttons';
import { AcCount, AcFilterBar } from '../../../ui/chips';
import { AcDrawerHandle, AcDrawerState, AcDrawerTab } from '../../../ui/containers';
import { storedFlag } from '../../../core/stored-flag';
import { AcInput, AcSegmented, AcSelect, AcSlider } from '../../../ui/fields';
import { AcBreakpointService } from '../../../ui/layout.services';
import { AcTabs, type AcTab } from '../../../ui/nav';
import { AcOverlayService } from '../../../ui/overlay';
import { CardSearchStore } from '../card-search.store';
import { openEffectEditor } from '../effect-editor/effect-editor.overlay';
import { FiltersPanel } from '../filters-panel/filters-panel';
import { openFiltersSheet } from '../filters-sheet/filters-sheet.overlay';
import { SearchResults } from '../search-results/search-results';

export interface CardSourceTab extends AcTab {
  id: CardSource;
}

/** The icons (wide screens) say each source at a glance, as the site's tabs. */
export const CARD_SOURCES: CardSourceTab[] = [
  { id: 'all', icon: 'layers', label: $localize`:@@search.source.all:Toutes les cartes`, short: $localize`:@@search.source.allShort:Toutes` },
  { id: 'favorites', icon: 'star', label: $localize`:@@search.source.favorites:Favoris` },
  { id: 'collection', icon: 'archive', label: $localize`:@@search.source.collection:Collection physique`, short: $localize`:@@search.source.collectionShort:Collection` },
  { id: 'owned', icon: 'monitor-cloud', label: $localize`:@@search.source.owned:Propriété numérique`, short: $localize`:@@search.source.ownedShort:Numérique` },
];

/** Compact screens: tabs in the row, the others under « Plus ». */
const COMPACT_SOURCE_TABS = 4;

/** Cards narrower than this are no longer readable: the most columns the width allows. */
const MIN_CARD_WIDTH = 140;
/** Fewest columns: beyond it a card is huge (the zoom shows one card large). */
const MIN_COLUMNS = 2;
/** Most columns, whatever the width. */
const MAX_COLUMNS = 8;
/** Uniques are read: at most 7 columns. */
const MAX_READABLE_COLUMNS = 7;
/** Usual card width where the grid is left alone (expanded, then medium windows). */
const USUAL_CARD_WIDTH = { expanded: 200, medium: 168 };
const COLUMNS_KEY = 'rebuilder.search.columns';

function storedColumns(): number | null {
  try {
    const n = Number(localStorage.getItem(COLUMNS_KEY));
    return Number.isInteger(n) && n >= MIN_COLUMNS && n <= MAX_COLUMNS ? n : null;
  } catch {
    return null;
  }
}

/** Filters typed into a text field: a change is applied once the typing pauses. */
const TEXT_FILTERS = ['q', 'text', 'mainCost', 'recallCost', 'forestPower', 'mountainPower', 'oceanPower'] as const satisfies readonly (keyof SearchFilters)[];

/**
 * Card search shared by the deck editor and the card browser: source tabs (`?source=`), filters
 * (aside ≥ 1200 px, sheet below), active-filter chips, sort, grid / list results.
 * The host provides `CardSearchStore`; `faction` locks the search to one faction (the deck's hero).
 */
@Component({
  selector: 'app-card-search',
  imports: [AcTabs, AcSegmented, AcSlider, AcSelect, AcInput, AcIconButton, AcButton, AcCount, AcFilterBar, AcDrawerHandle, AcDrawerTab, FiltersPanel, SearchResults],
  host: { '[class.compact]': 'bp.compact()', '[class.browse]': 'browse()' },
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
    this.route.queryParamMap.pipe(map((q) => sourceFromParams((k) => q.get(k)))),
    { initialValue: 'all' as CardSource },
  );

  private readonly allOrderOptions = ORDER_OPTIONS.map((o) => ({ value: o.value, label: o.label }));
  private readonly allCompactOrderOptions = ORDER_OPTIONS.map((o) => ({ value: o.value, label: $localize`:@@search.card.sortOption:Tri : ${o.label}:order:` }));
  private readonly hideRandomSort = computed(
    () => this.search.source() === 'all' && !!this.uniquesApi.baseUrl,
  );
  protected readonly orderOptions = computed(() =>
    this.hideRandomSort() ? this.allOrderOptions.filter((o) => o.value !== 'random') : this.allOrderOptions,
  );
  protected readonly compactOrderOptions = computed(() =>
    this.hideRandomSort() ? this.allCompactOrderOptions.filter((o) => o.value !== 'random') : this.allCompactOrderOptions,
  );
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

  /** Grid size (from 768 px): the columns chosen with the slider, remembered in this browser; null until the user moves it. */
  private readonly columnsPref = signal<number | null>(storedColumns());
  /** Width of the results and gap between cards, measured; 0 until the first measure. */
  private readonly gridWidth = signal(0);
  private readonly gridGap = signal(8);
  protected readonly minColumns = MIN_COLUMNS;
  /** Uniques are read: the grid keeps at most 7 columns. */
  protected readonly readable = computed(
    () => this.search.source() === 'all' && (!this.search.filters().rarities.length || this.search.filters().rarities.includes('UNIQUE')),
  );
  /** The most columns the width allows (cards stay at least `MIN_CARD_WIDTH` wide). */
  protected readonly maxColumns = computed(() => {
    const cap = this.readable() ? MAX_READABLE_COLUMNS : MAX_COLUMNS;
    const width = this.gridWidth();
    if (!width) return cap;
    const fit = Math.floor((width + this.gridGap()) / (MIN_CARD_WIDTH + this.gridGap()));
    return Math.max(MIN_COLUMNS, Math.min(cap, fit));
  });
  /** Columns shown: the user's choice within what the width allows, else what the usual card width gives; null until measured. */
  protected readonly columns = computed<number | null>(() => {
    const width = this.gridWidth();
    if (!width) return null;
    const usual = this.bp.expanded() ? USUAL_CARD_WIDTH.expanded : USUAL_CARD_WIDTH.medium;
    const usualColumns = Math.floor((width + this.gridGap()) / (usual + this.gridGap()));
    return Math.max(MIN_COLUMNS, Math.min(this.maxColumns(), this.columnsPref() ?? usualColumns));
  });
  /** Slider position: more to the right is larger cards, so fewer columns. */
  protected readonly sizeLevel = computed(() => MIN_COLUMNS + this.maxColumns() - (this.columns() ?? this.maxColumns()));

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
  // The account lists (favorites, collection, ownership) have their own order; the unified search tab supports sorting.
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
          this.search.configure(source, faction, format, this.browse() ? this.urlFilters(source, format) : undefined);
          this.draft.set(this.search.filters());
        }
      });
    });

    effect(() => {
      const f = this.search.filters();
      untracked(() => this.draft.set(f));
    });

    // Card browser: the filters applied go in the URL (reload, shared link), in place of the current entry.
    effect(() => {
      const filters = this.search.filters();
      const source = this.search.source();
      if (!this.browse() || !this.search.configured()) return;
      untracked(() => {
        const params = filtersToParams(filters, defaultFilters(source, this.search.format()));
        const next = this.router.createUrlTree([], { relativeTo: this.route, queryParams: params, queryParamsHandling: 'merge' });
        if (this.router.serializeUrl(next) === this.router.url) return;
        void this.router.navigateByUrl(next, { replaceUrl: true });
      });
    });

    effect(() => {
      if (this.source() !== 'all' || !this.uniquesApi.baseUrl) return;
      untracked(() => this.prefetchAbilities());
    });

    // The width the grid can use, to bound the slider; read on resize of the results column only.
    afterNextRender(() => {
      const results = this.el.querySelector<HTMLElement>('.results');
      if (!results) return;
      const measure = () => {
        const style = getComputedStyle(results);
        this.gridWidth.set(Math.round(results.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)));
        const grid = results.querySelector<HTMLElement>('ac-virtual-grid');
        const gap = grid ? parseFloat(getComputedStyle(grid).columnGap) : NaN;
        if (Number.isFinite(gap)) this.gridGap.set(gap);
      };
      const observer = new ResizeObserver(measure);
      observer.observe(results);
      measure();
      this.injector.get(DestroyRef).onDestroy(() => observer.disconnect());
    }, { injector: this.injector });

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
        // Card browser: the source tabs stick above the panel, which sits under them.
        const tabs = host.querySelector<HTMLElement>('ac-tabs');
        if (tabs) host.style.setProperty('--app-tabs-height', `${tabs.offsetHeight}px`);
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

  /** Another tab starts from its own default filters: the URL keeps the tab alone. */
  protected setSource(id: string): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { source: id === 'all' ? null : id }, replaceUrl: true });
  }

  /** The card browser's URL filters over the tab's defaults. */
  private urlFilters(source: CardSource, format: DeckFormat | null): SearchFilters {
    const q = this.route.snapshot.queryParamMap;
    return filtersFromParams(defaultFilters(source, format), (k) => q.getAll(k), (k) => q.get(k));
  }

  protected onDraft(next: SearchFilters): void {
    const prev = this.draft();
    this.draft.set(next);
    clearTimeout(this.applyTimer);
    if (hasInvalidNumericFilters(next, this.search.source())) return;
    // Free-text fields (name, card text, costs, powers) wait for the typing to pause.
    const textChanged = TEXT_FILTERS.some((key) => prev[key] !== next[key]);
    if (textChanged) this.applyTimer = setTimeout(() => this.search.apply(this.draft()), 350);
    else this.search.apply(next);
  }

  protected applyNow(): void {
    clearTimeout(this.applyTimer);
    const next = this.draft();
    if (hasInvalidNumericFilters(next, this.search.source())) return;
    this.search.apply(next);
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

  protected setSizeLevel(level: number): void {
    const columns = MIN_COLUMNS + this.maxColumns() - level;
    this.columnsPref.set(columns);
    try {
      localStorage.setItem(COLUMNS_KEY, String(columns));
    } catch {
      // Not remembered: the size still applies for this visit.
    }
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

  protected editEffect(index: EffectSlot): void {
    const effect = effectAt(this.draft(), index);
    if (!effect) return;
    openEffectEditor(this.overlay, { effect, index, query: toSearchParams(this.draft(), this.search.faction(), 1, 1) }).afterClosed.subscribe((next) =>
      this.onDraft(withEditedEffect(this.draft(), index, next)),
    );
  }

  protected scrollTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
