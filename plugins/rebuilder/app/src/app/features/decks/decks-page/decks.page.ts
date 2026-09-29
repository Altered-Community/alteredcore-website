import { Component, DestroyRef, ElementRef, computed, effect, inject, linkedSignal, signal, untracked, viewChild } from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterLink } from '@angular/router';
import { finalize, map, switchMap, timer } from 'rxjs';
import { AuthSession } from '../../../core/auth-session';
import { toDeckListItem, type DeckListItem } from '../../../core/deck-view';
import { DecksApiService, type PublicDeckPage, type PublicDeckQuery } from '../../../core/decks-api.service';
import { DECK_FORMATS } from '../../../core/formats';
import { GuestDeckService } from '../../../core/guest-deck.service';
import { DeckStore } from '../../../core/deck-store';
import { ArButton, ArIconButton } from '../../../ui/buttons';
import { ArChip, ArCount } from '../../../ui/chips';
import { ArInput, ArSegmented, ArSelect } from '../../../ui/fields';
import { ArIcon } from '../../../ui/icon';
import { ArInfiniteSentinel } from '../../../ui/infinite';
import { ArBreakpointService } from '../../../ui/layout.services';
import { ArDeckCard, FACTIONS } from '../../../ui/metier';
import { ArAppBar, ArTabs } from '../../../ui/nav';
import { ArOverlayService } from '../../../ui/overlay';
import { openNewDeck } from '../../shared/new-deck/new-deck.overlay';
import { SITE_MENU_ENABLED, SiteMenuService } from '../../shared/site-menu/site-menu';
import { isDecksListUrl } from '../decks-list-reuse';
import { openImportDeck } from '../import-deck/import-deck.overlay';
import { type Visibility, type DeckFilters, type DeckSort, EMPTY_DECK_FILTERS, filterDecks } from '../deck-filters';
import { DeckFiltersSheet } from '../deck-filters-sheet/deck-filters-sheet';

type Tab = 'mine' | 'community';

const COMMUNITY_PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 300;

interface CommunityState {
  items: DeckListItem[];
  /** API total minus the illegal decks dropped from the pages loaded so far. */
  total: number | null;
  dropped: number;
  page: number;
  lastPage: number;
}

const EMPTY_COMMUNITY: CommunityState = { items: [], total: null, dropped: 0, page: 0, lastPage: 1 };

const SORTS: { value: DeckSort; label: string }[] = [
  { value: 'updated', label: 'Récemment modifié' },
  { value: 'created', label: 'Récemment créé' },
  { value: 'likes', label: 'Les plus aimés' },
  { value: 'name', label: 'Nom' },
];

const API_ORDER: Record<DeckSort, NonNullable<PublicDeckQuery['order']>> = {
  updated: 'updatedAt',
  created: 'createdAt',
  likes: 'upvoteCount',
  name: 'name',
};

type LikeState = Pick<DeckListItem, 'likes' | 'liked'>;

@Component({
  selector: 'app-decks-page',
  imports: [RouterLink, ArAppBar, ArTabs, ArButton, ArIconButton, ArInput, ArSelect, ArSegmented, ArChip, ArDeckCard, ArIcon, ArCount, ArInfiniteSentinel],
  templateUrl: './decks.page.html',
  styleUrl: './decks.page.scss',
})
export class DecksPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly overlay = inject(ArOverlayService);
  private readonly decksApi = inject(DecksApiService);
  private readonly guests = inject(GuestDeckService);
  private readonly store = inject(DeckStore);
  protected readonly auth = inject(AuthSession);
  protected readonly bp = inject(ArBreakpointService);
  protected readonly menu = inject(SiteMenuService);
  protected readonly siteMenu = inject(SITE_MENU_ENABLED);

  protected readonly tab = toSignal(this.route.queryParamMap.pipe(map((q) => (q.get('tab') === 'community' ? 'community' : 'mine') as Tab)), {
    initialValue: 'mine' as Tab,
  });
  protected readonly filters = signal<DeckFilters>(EMPTY_DECK_FILTERS);

  /**
   * Account decks; follows the session, so logging in or out reloads them. Embedded in the site
   * there is no token in the browser (the relay adds it), hence the user name as the key.
   */
  private readonly serverRes = rxResource({
    params: () => (this.auth.isLoggedIn() ? { token: this.auth.token(), user: this.auth.username() } : undefined),
    stream: () => this.decksApi.listMine(1, 60).pipe(map((body) => (Array.isArray(body) ? body : body.member ?? []))),
  });
  private readonly serverDecks = computed(() => (this.serverRes.hasValue() ? this.serverRes.value() : []));
  protected readonly serverError = computed(() => {
    const err = this.serverRes.error();
    if (!err) return null;
    return (err as { status?: number }).status === 401
      ? 'Session expirée : les decks du compte ne peuvent pas être chargés (401).'
      : 'Decks du compte indisponibles.';
  });
  protected readonly mine = computed(() => [...this.guests.decks(), ...this.serverDecks()].map(toDeckListItem));
  protected readonly mineFiltered = computed(() => filterDecks(this.mine(), this.filters()));

  /** API query for the community tab; `undefined` on « Mes decks » (resource idle). Hero and visibility do not reach the API. */
  private readonly communityQuery = computed(
    () => (this.tab() === 'community' ? toPublicQuery(this.filters()) : undefined),
    { equal: (a, b) => JSON.stringify(a) === JSON.stringify(b) },
  );
  /** Back to page 1 whenever the query changes. */
  private readonly communityPage = linkedSignal({ source: this.communityQuery, computation: () => 1 });
  /** A new query or page cancels the pending request; the text search waits 300 ms before firing. */
  private readonly communityRes = rxResource({
    params: () => {
      const query = this.communityQuery();
      return query && { ...query, page: this.communityPage() };
    },
    stream: ({ params }) => {
      // Tags the response with the query it answers, so a page never lands in another query's list.
      const query = untracked(this.communityQuery);
      return timer(params.page === 1 && params.name ? SEARCH_DEBOUNCE_MS : 0).pipe(
        switchMap(() => this.decksApi.listPublic(params)),
        map((res) => ({ query, page: params.page, res })),
      );
    },
  });
  /** Pages accumulated for the current query; a failed page keeps the ones already shown. */
  private readonly communityState = linkedSignal<
    { query: PublicDeckQuery | undefined; loaded: { query: PublicDeckQuery | undefined; page: number; res: PublicDeckPage } | undefined },
    CommunityState
  >({
    source: () => ({ query: this.communityQuery(), loaded: this.communityRes.hasValue() ? this.communityRes.value() : undefined }),
    computation: ({ query, loaded }, prev) => {
      const current = prev && prev.source.query === query ? prev.value : EMPTY_COMMUNITY;
      if (!loaded || loaded.query !== query || loaded.page <= current.page) return current;
      // The API has no legality filter: illegal decks are dropped here (the server-computed `legal` flag).
      const members = loaded.res.member ?? [];
      const legal = members.filter((d) => d.legal);
      const dropped = (loaded.page === 1 ? 0 : current.dropped) + members.length - legal.length;
      const seen = new Set(loaded.page === 1 ? [] : current.items.map((d) => d.id));
      const items = [...(loaded.page === 1 ? [] : current.items), ...legal.map(toDeckListItem).filter((d) => !seen.has(d.id))];
      return {
        items: query?.order === 'updatedAt' ? byLastUpdate(items) : items,
        dropped,
        total: loaded.res.totalItems == null ? null : loaded.res.totalItems - dropped,
        page: loaded.page,
        lastPage: loaded.res.lastPage ?? loaded.page,
      };
    },
  });
  protected readonly community = computed(() => this.communityState().items);
  protected readonly communityTotal = computed(() => this.communityState().total);
  protected readonly communityLoading = computed(() => this.communityRes.isLoading());
  protected readonly communityError = computed(() => (this.communityRes.error() ? 'Impossible de charger les decks publics.' : null));
  /** The infinite-scroll sentinel is on screen. */
  private readonly wantMore = signal(false);
  /** Window scroll of this list. Kept while a deck is open so Back can return to the same offset. */
  private listScroll = 0;
  /** False while another route is showing, so that page's scroll does not overwrite `listScroll`. */
  private trackScroll = true;
  private readonly listSentinel = viewChild<ElementRef<HTMLElement>>('listSentinel');

  /** Likes toggled on this page, over what the API listed; dropped when the account changes. */
  private readonly likes = linkedSignal<string | null, Record<string, LikeState>>({
    source: () => this.auth.token() ?? this.auth.username(),
    computation: () => ({}),
  });
  private readonly pendingLikes = new Set<string>();

  protected readonly list = computed(() => {
    const likes = this.likes();
    return (this.tab() === 'mine' ? this.mineFiltered() : this.community()).map((d) => (likes[d.id] ? { ...d, ...likes[d.id] } : d));
  });
  protected readonly tabs = computed(() => [
    { id: 'mine', label: `Mes decks · ${this.mine().length}` },
    { id: 'community', label: 'Communauté' },
  ]);
  protected readonly formats = [{ value: '', label: 'Tous les formats' }, ...DECK_FORMATS.map((f) => ({ value: f.value, label: f.label }))];
  protected readonly heroes = computed(() => {
    const names = [...new Set(this.mine().map((d) => d.hero?.name).filter((n): n is string => !!n))].sort();
    return [{ value: '', label: 'Tous les héros' }, ...names.map((n) => ({ value: n, label: n }))];
  });
  protected readonly visibilities = [
    { value: 'all' as Visibility, label: 'Tous' },
    { value: 'public' as Visibility, label: 'Publics' },
    { value: 'private' as Visibility, label: 'Privés' },
  ];
  protected readonly sorts = SORTS;
  protected readonly factions = FACTIONS;
  protected readonly activeFilters = computed(() => {
    const f = this.filters();
    return (f.format ? 1 : 0) + (f.hero ? 1 : 0) + (f.visibility !== 'all' ? 1 : 0) + f.factions.length;
  });
  protected readonly countLabel = computed(() => {
    const n = this.tab() === 'mine' ? this.list().length : this.communityTotal() ?? this.list().length;
    return `${n.toLocaleString('fr-FR')} deck${n > 1 ? 's' : ''}`;
  });

  constructor() {
    this.guests.reload();
    // Keeps loading pages while the sentinel stays visible (fast scroll, tall screens).
    effect(() => {
      const { page, lastPage } = this.communityState();
      if (!this.wantMore() || this.communityLoading() || this.communityError() || page === 0 || page >= lastPage) return;
      untracked(() => this.communityPage.set(page + 1));
    });

    const destroyRef = inject(DestroyRef);
    const onScroll = () => {
      if (this.trackScroll && isDecksListUrl(this.router.url)) this.listScroll = window.scrollY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll));

    // The list component stays alive (see DecksListReuseStrategy). Remember its scroll when leaving,
    // and put that exact offset back when the list is shown again. Never jump to the top.
    this.router.events.pipe(takeUntilDestroyed()).subscribe((e) => {
      if (e instanceof NavigationStart && isDecksListUrl(this.router.url) && !isDecksListUrl(e.url)) {
        const y = window.scrollY;
        if (y > 0 || this.listScroll === 0) this.listScroll = y;
        this.trackScroll = false;
        this.wantMore.set(false);
      }
      if (e instanceof NavigationStart && e.navigationTrigger === 'popstate' && isDecksListUrl(e.url)) {
        if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      }
      if ((e instanceof NavigationCancel || e instanceof NavigationError) && isDecksListUrl(this.router.url)) {
        this.trackScroll = true;
      }
      if (e instanceof NavigationEnd && isDecksListUrl(e.urlAfterRedirects) && !this.trackScroll) {
        const y = this.listScroll;
        const apply = () => window.scrollTo(0, y);
        apply();
        requestAnimationFrame(() => {
          apply();
          this.trackScroll = true;
          this.syncSentinel();
          if ('scrollRestoration' in history) history.scrollRestoration = 'auto';
        });
      }
    });
  }

  /** Re-arm infinite scroll after the list view is reattached (the observer may not emit on its own). */
  private syncSentinel(): void {
    const el = this.listSentinel()?.nativeElement;
    if (!el || this.tab() !== 'community') return;
    const rect = el.getBoundingClientRect();
    const lookahead = window.innerHeight * 3;
    this.wantMore.set(rect.top < window.innerHeight + lookahead && rect.bottom > 0);
  }

  protected setTab(id: string): void {
    void this.router.navigate([], { queryParams: { tab: id === 'community' ? 'community' : null }, replaceUrl: true });
  }

  protected patch(p: Partial<DeckFilters>): void {
    this.filters.update((f) => ({ ...f, ...p }));
  }

  protected toggleFaction(code: string, on: boolean): void {
    this.filters.update((f) => ({ ...f, factions: on ? [...f.factions, code] : f.factions.filter((c) => c !== code) }));
  }

  protected newDeck(): void {
    openNewDeck(this.overlay).afterClosed.subscribe((res) => {
      if (!res) return;
      this.store.createDeck(res).subscribe((deck) => void this.router.navigate(['/decks', deck.id, 'edit']));
    });
  }

  protected importDeck(): void {
    openImportDeck(this.overlay).afterClosed.subscribe((id) => {
      if (id) void this.router.navigate(['/decks', id]);
    });
  }

  protected openFilters(): void {
    this.overlay
      .open<DeckFiltersSheet, DeckFilters>(DeckFiltersSheet, {
        title: 'Filtres',
        data: {
          filters: this.filters(),
          formats: this.formats,
          heroes: this.heroes(),
          visibilities: this.visibilities,
          showVisibility: this.tab() === 'mine',
        },
      })
      .afterClosed.subscribe((f) => f && this.filters.set(f));
  }

  /** Optimistic toggle, then the count the API returns; guests go to the login page (the upvote needs a token). */
  protected toggleLike(deck: DeckListItem): void {
    if (!this.auth.isLoggedIn()) {
      void this.router.navigateByUrl('/login');
      return;
    }
    if (this.pendingLikes.has(deck.id)) return;
    this.pendingLikes.add(deck.id);
    const before = { likes: deck.likes, liked: deck.liked };
    this.setLike(deck.id, { likes: Math.max(0, deck.likes + (deck.liked ? -1 : 1)), liked: !deck.liked });
    this.decksApi
      .upvote(deck.id)
      .pipe(finalize(() => this.pendingLikes.delete(deck.id)))
      .subscribe({
        next: (r) => this.setLike(deck.id, { likes: r.upvoteCount, liked: r.hasUpvoted }),
        error: (err: { status?: number }) => {
          this.setLike(deck.id, before);
          if (err.status === 401) void this.router.navigateByUrl('/login');
        },
      });
  }

  private setLike(id: string, state: LikeState): void {
    this.likes.update((all) => ({ ...all, [id]: state }));
  }

  protected onSentinel(visible: boolean): void {
    this.wantMore.set(visible);
  }
}

/**
 * The API sorts `updatedAt` DESC with never-modified decks (`updatedAt` null) first, whatever their age. Their date is the
 * creation date here (`lastModified`), so a stable sort of the pages loaded so far moves them to their place; later
 * pages are older than every dated deck already shown, so the order stays right as pages load.
 */
function byLastUpdate(items: DeckListItem[]): DeckListItem[] {
  return [...items].sort((a, b) => (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0));
}

function toPublicQuery(f: DeckFilters): PublicDeckQuery {
  return {
    itemsPerPage: COMMUNITY_PAGE_SIZE,
    name: f.q.trim() || undefined,
    faction: f.factions.length === 1 ? f.factions[0] : undefined,
    format: f.format || undefined,
    order: API_ORDER[f.sort],
  };
}
