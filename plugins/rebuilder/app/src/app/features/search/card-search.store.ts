import { Service, computed, effect, inject, linkedSignal, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { CardsApiService } from '../../core/cards-api.service';
import {
  defaultFilters,
  filterChips,
  removeChip,
  toSearchParams,
  type CardSource,
  type SearchFilters,
} from '../../core/card-filters';
import type { Card, CardCollection } from '../../core/models';

export const PAGE_SIZE: Record<CardSource, number> = { all: 36, uniques: 36, owned: 36, favorites: 36 };

/** A page still loading after this long gets a « still searching » notice. */
export const SLOW_MS = 3000;

/** Sources that need an account: nothing to fetch from the cards API yet. */
const LOGIN_ONLY: readonly CardSource[] = ['owned', 'favorites'];

interface SearchQuery {
  source: CardSource;
  faction: string | null;
  filters: SearchFilters;
  /** Bumped by `restart()` so that applying the same filters still refetches from page 1. */
  run: number;
}

interface LoadedPage {
  query: SearchQuery;
  page: number;
  res: CardCollection;
  ms: number;
}

interface SearchState {
  cards: Card[];
  total: number | null;
  page: number;
  lastPage: number;
  timings: number[];
}

function emptyState(source: CardSource): SearchState {
  return LOGIN_ONLY.includes(source)
    ? { cards: [], total: 0, page: 0, lastPage: 0, timings: [] }
    : { cards: [], total: null, page: 0, lastPage: 1, timings: [] };
}

/**
 * Infinite card search. `wantMore` is driven by an IntersectionObserver sentinel placed ~3 viewports
 * ahead; while it stays true, pages are chained back-to-back so a fast flick never shows an empty tail.
 */
@Service({ autoProvided: false })
export class CardSearchStore {
  private readonly api = inject(CardsApiService);

  readonly source = signal<CardSource>('all');
  readonly faction = signal<string | null>(null);
  readonly filters = signal<SearchFilters>(defaultFilters('all'));
  private readonly run = signal(0);
  private readonly wantMore = signal(false);

  private readonly query = computed<SearchQuery>(() => ({
    source: this.source(),
    faction: this.faction(),
    filters: this.filters(),
    run: this.run(),
  }));
  /** Back to page 1 whenever the query changes. */
  private readonly requestedPage = linkedSignal({ source: this.query, computation: () => 1 });
  /** A new query or page cancels the pending request, so a stale page never lands in the list. */
  private readonly pageRes = rxResource({
    params: () => {
      const query = this.query();
      return LOGIN_ONLY.includes(query.source) ? undefined : { query, page: this.requestedPage() };
    },
    stream: ({ params: { query, page } }) => {
      const started = performance.now();
      const params = toSearchParams(query.filters, query.source, query.faction, page, PAGE_SIZE[query.source]);
      return this.api.search(params).pipe(map((res): LoadedPage => ({ query, page, res, ms: Math.round(performance.now() - started) })));
    },
  });
  /** Pages accumulated for the current query; a failed page keeps the ones already shown. */
  private readonly state = linkedSignal<{ query: SearchQuery; loaded: LoadedPage | undefined }, SearchState>({
    source: () => ({ query: this.query(), loaded: this.pageRes.hasValue() ? this.pageRes.value() : undefined }),
    computation: ({ query, loaded }, prev) => {
      const current = prev && prev.source.query === query ? prev.value : emptyState(query.source);
      if (!loaded || loaded.query !== query || loaded.page <= current.page) return current;
      const seen = new Set(current.cards.map((c) => c.reference));
      return {
        cards: [...current.cards, ...loaded.res.member.filter((c) => !seen.has(c.reference))],
        total: loaded.res.totalItems,
        page: loaded.page,
        lastPage: loaded.res.lastPage,
        timings: [...current.timings, loaded.ms],
      };
    },
  });

  readonly cards = computed(() => this.state().cards);
  readonly total = computed(() => this.state().total);
  readonly page = computed(() => this.state().page);
  readonly lastPage = computed(() => this.state().lastPage);
  readonly loading = computed(() => this.pageRes.isLoading());
  readonly error = computed(() => {
    const err = this.pageRes.error();
    if (!err) return null;
    const status = (err as { status?: number }).status;
    return status === 504 || status === 0
      ? $localize`:@@search.store.timeout:La recherche a pris trop de temps. Affinez les filtres (extension, coût, effet) et réessayez.`
      : $localize`:@@search.store.error:Impossible de charger les cartes.`;
  });
  readonly hasMore = computed(() => this.page() < this.lastPage());
  readonly chips = computed(() => filterChips(this.filters(), this.source()));
  /** Timings of the last pages, for diagnostics / perf numbers. */
  readonly timings = computed(() => this.state().timings);

  /** The current page has been loading for more than `SLOW_MS`. */
  readonly slow = signal(false);

  constructor() {
    // Keeps loading pages while the sentinel stays visible.
    effect(() => {
      if (!this.wantMore() || this.loading() || this.page() === 0) return;
      this.loadMore();
    });

    effect((onCleanup) => {
      this.slow.set(false);
      if (!this.loading()) return;
      const timer = setTimeout(() => this.slow.set(true), SLOW_MS);
      onCleanup(() => clearTimeout(timer));
    });
  }

  configure(source: CardSource, faction: string | null): void {
    const changedSource = source !== this.source();
    this.source.set(source);
    this.faction.set(faction);
    if (changedSource) this.filters.set(defaultFilters(source));
    this.restart();
  }

  apply(filters: SearchFilters): void {
    this.filters.set(filters);
    this.restart();
  }

  patch(partial: Partial<SearchFilters>): void {
    this.apply({ ...this.filters(), ...partial });
  }

  removeChip(id: string): void {
    this.apply(removeChip(this.filters(), id));
  }

  clearAll(): void {
    const empty = { ...defaultFilters(this.source()), sets: [], rarities: [], types: [], q: '', order: this.filters().order };
    this.apply(empty);
  }

  reset(): void {
    this.apply(defaultFilters(this.source()));
  }

  /** Sentinel visibility from the view. */
  setWantMore(visible: boolean): void {
    this.wantMore.set(visible);
  }

  loadMore(): void {
    untracked(() => {
      if (this.loading() || !this.hasMore() || this.error() || this.page() === 0) return;
      this.requestedPage.set(this.page() + 1);
    });
  }

  /** Refetches the page that failed. */
  retry(): void {
    this.pageRes.reload();
  }

  /** Drops loaded pages and fetches page 1 again. */
  restart(): void {
    this.run.update((n) => n + 1);
  }
}
