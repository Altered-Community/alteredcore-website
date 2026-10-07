import { Service, computed, effect, inject, linkedSignal, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { map, type Observable } from 'rxjs';
import { CardsApiService } from '../../core/cards-api.service';
import {
  defaultFilters,
  filterChips,
  removeChip,
  toSearchParams,
  toUniquesQuery,
  type CardSource,
  type SearchFilters,
} from '../../core/card-filters';
import type { Card, DeckFormat } from '../../core/models';
import { allowedInFormat } from '../../core/deck-rules';
import { UniquesApiService } from '../../core/uniques-api.service';
import { OwnedCardsService } from '../../core/owned-cards.service';
import { AuthSession } from '../../core/auth-session';

export const PAGE_SIZE: Record<CardSource, number> = { all: 36, uniques: 36, collection: 36, owned: 36, favorites: 36 };

/** A page still loading after this long gets a « still searching » notice. */
export const SLOW_MS = 3000;

/** Sources of the user's own cards (the site's endpoints): nothing to fetch for a guest. */
const LOGIN_ONLY: readonly CardSource[] = ['collection', 'owned', 'favorites'];

interface SearchQuery {
  source: CardSource;
  faction: string | null;
  /** The deck's format in the editor (Favoris: « légales »), `null` on the card browser. */
  format: DeckFormat | null;
  filters: SearchFilters;
  /** Bumped by `restart()` so that applying the same filters still refetches from page 1. */
  run: number;
}

/**
 * Where a page starts: a page number on the cards API, a cursor on the Uniques search API
 * (`null`: the first page). `page` counts the pages of the query.
 */
interface PageRequest {
  page: number;
  from: number | null;
}

/** A page of either API; `next` is where the following page starts, `null` at the end. */
interface ResultPage {
  member: Card[];
  totalItems: number;
  next: number | null;
}

interface LoadedPage {
  query: SearchQuery;
  page: number;
  res: ResultPage;
  ms: number;
}

interface SearchState {
  cards: Card[];
  total: number | null;
  page: number;
  next: number | null;
  timings: number[];
}

const FIRST_PAGE: PageRequest = { page: 1, from: null };

function emptyState(source: CardSource, guest: boolean): SearchState {
  return guest && LOGIN_ONLY.includes(source)
    ? { cards: [], total: 0, page: 0, next: null, timings: [] }
    : { cards: [], total: null, page: 0, next: null, timings: [] };
}

/**
 * Infinite card search: the Uniques tab on the Uniques search API, the others on the cards API.
 * `wantMore` is driven by an IntersectionObserver sentinel placed ~3 viewports
 * ahead; while it stays true, pages are chained back-to-back so a fast flick never shows an empty tail.
 */
@Service({ autoProvided: false })
export class CardSearchStore {
  private readonly api = inject(CardsApiService);
  private readonly uniquesApi = inject(UniquesApiService);
  private readonly owned = inject(OwnedCardsService);
  private readonly auth = inject(AuthSession);

  readonly source = signal<CardSource>('all');
  readonly faction = signal<string | null>(null);
  readonly format = signal<DeckFormat | null>(null);
  readonly filters = signal<SearchFilters>(defaultFilters('all'));
  private readonly run = signal(0);
  /**
   * `configure()` has run: no request before, since the query depends on the context (the editor's deck: its hero's
   * faction and its format, known once the deck is open). Meanwhile the search reads as loading.
   */
  readonly configured = signal(false);
  private readonly wantMore = signal(false);

  private readonly query = computed<SearchQuery>(() => ({
    source: this.source(),
    faction: this.faction(),
    format: this.format(),
    filters: this.filters(),
    run: this.run(),
  }));
  /** Back to the first page whenever the query changes. */
  private readonly requestedPage = linkedSignal<SearchQuery, PageRequest>({ source: this.query, computation: () => FIRST_PAGE });
  /** A new query or page cancels the pending request, so a stale page never lands in the list. */
  private readonly pageRes = rxResource({
    params: () => {
      const query = this.query();
      if (!this.configured()) return undefined;
      return LOGIN_ONLY.includes(query.source) && !this.auth.isLoggedIn() ? undefined : { query, request: this.requestedPage() };
    },
    stream: ({ params: { query, request } }) => {
      const started = performance.now();
      return this.fetchPage(query, request).pipe(
        map((res): LoadedPage => ({ query, page: request.page, res, ms: Math.round(performance.now() - started) })),
      );
    },
  });
  /** Pages accumulated for the current query; a failed page keeps the ones already shown. */
  private readonly state = linkedSignal<{ query: SearchQuery; loaded: LoadedPage | undefined }, SearchState>({
    source: () => ({ query: this.query(), loaded: this.pageRes.hasValue() ? this.pageRes.value() : undefined }),
    computation: ({ query, loaded }, prev) => {
      const current = prev && prev.source.query === query ? prev.value : emptyState(query.source, !this.auth.isLoggedIn());
      if (!loaded || loaded.query !== query || loaded.page <= current.page) return current;
      const seen = new Set(current.cards.map((c) => c.reference));
      return {
        cards: [...current.cards, ...loaded.res.member.filter((c) => !seen.has(c.reference))],
        total: loaded.res.totalItems,
        page: loaded.page,
        next: loaded.res.next,
        timings: [...current.timings, loaded.ms],
      };
    },
  });

  readonly cards = computed(() => this.state().cards);
  readonly total = computed(() => this.state().total);
  readonly page = computed(() => this.state().page);
  readonly loading = computed(() => !this.configured() || this.pageRes.isLoading());
  readonly error = computed(() => {
    const err = this.pageRes.error();
    if (!err) return null;
    const status = (err as { status?: number }).status;
    return status === 504 || status === 0
      ? $localize`:@@search.store.timeout:La recherche a pris trop de temps. Affinez les filtres (extension, coût, effet) et réessayez.`
      : $localize`:@@search.store.error:Impossible de charger les cartes.`;
  });
  readonly hasMore = computed(() => this.state().next !== null);
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
      if (!this.pageRes.isLoading()) return;
      const timer = setTimeout(() => this.slow.set(true), SLOW_MS);
      onCleanup(() => clearTimeout(timer));
    });
  }

  configure(source: CardSource, faction: string | null, format: DeckFormat | null = null): void {
    const changedSource = source !== this.source();
    this.source.set(source);
    this.faction.set(faction);
    this.format.set(format);
    if (changedSource) this.filters.set(defaultFilters(source));
    this.configured.set(true);
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
      const { page, next } = this.state();
      if (this.loading() || next === null || this.error() || page === 0) return;
      this.requestedPage.set({ page: page + 1, from: next });
    });
  }

  /** Refetches the page that failed. */
  retry(): void {
    this.pageRes.reload();
  }

  /** Drops loaded pages and fetches the first page again. */
  restart(): void {
    this.run.update((n) => n + 1);
  }

  private fetchPage(query: SearchQuery, request: PageRequest): Observable<ResultPage> {
    const size = PAGE_SIZE[query.source];
    if (query.source === 'uniques') return this.uniquesApi.search(toUniquesQuery(query.filters, query.faction), request.from, size);
    const page = request.from ?? 1;
    if (query.source === 'collection' || query.source === 'owned' || query.source === 'favorites') {
      const factions = query.faction ? (query.filters.otherFactions.length ? query.filters.otherFactions : [query.faction]) : query.filters.factions;
      // Favoris « légales »: the cards the format forbids are dropped page by page (the total counts them until then).
      const format = query.source === 'favorites' && query.filters.legalOnly ? query.format : null;
      return this.owned.search(query.source, query.filters, factions, page, size, format).pipe(
        map((res): ResultPage => {
          const member = format ? res.member.filter((c) => allowedInFormat(c, format)) : res.member;
          return { member, totalItems: res.totalItems - (res.member.length - member.length), next: page < res.lastPage ? page + 1 : null };
        }),
      );
    }
    return this.api
      .search(toSearchParams(query.filters, query.faction, page, size))
      .pipe(map((res): ResultPage => ({ member: res.member, totalItems: res.totalItems, next: page < res.lastPage ? page + 1 : null })));
  }
}
