import { Component, DestroyRef, ElementRef, computed, effect, inject, linkedSignal, signal, untracked, viewChild } from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterLink } from '@angular/router';
import { finalize, from, map, switchMap, timer } from 'rxjs';
import { AuthSession } from '../../../core/auth-session';
import { toDeckListItem, type DeckListItem } from '../../../core/deck-view';
import { DecksApiService, type PublicDeckPage } from '../../../core/decks-api.service';
import { DECK_FORMATS } from '../../../core/formats';
import { GuestDeckService } from '../../../core/guest-deck.service';
import { uiLocale } from '../../../core/i18n';
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
import { isDecksListUrl } from '../decks-list-reuse';
import { openImportDeck } from '../import-deck/import-deck.overlay';
import { type Visibility, type DeckFilters, type DeckSort, EMPTY_DECK_FILTERS, filterDecks, matchDecks } from '../deck-filters';
import { DeckFiltersSheet } from '../deck-filters-sheet/deck-filters-sheet';
import { type ContestSet, contestDecksFor, loadContestDecks } from '../contest/contest-decks';
import { type CommunityQuery, type CommunityState, EMPTY_COMMUNITY, addCommunityPage, toCommunityQuery } from '../community-pages';

type Tab = 'mine' | 'community' | 'contest';

const TABS: readonly Tab[] = ['mine', 'community', 'contest'];

const SEARCH_DEBOUNCE_MS = 300;

const SORTS: { value: DeckSort; label: string }[] = [
  { value: 'updated', label: $localize`:@@decks.page.sortUpdated:Récemment modifié` },
  { value: 'created', label: $localize`:@@decks.page.sortCreated:Récemment créé` },
  { value: 'likes', label: $localize`:@@decks.page.sortLikes:Les plus aimés` },
  { value: 'name', label: $localize`:@@decks.page.sortName:Nom` },
];


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

  protected readonly tab = toSignal(
    this.route.queryParamMap.pipe(map((q) => TABS.find((t) => t === q.get('tab')) ?? 'mine')),
    { initialValue: 'mine' as Tab },
  );
  protected readonly filters = signal<DeckFilters>(EMPTY_DECK_FILTERS);

  /**
   * Account decks; follows the session, so logging in or out reloads them. Embedded in the site
   * there is no token in the browser (the relay adds it), hence the user name as the key.
   */
  private readonly serverRes = rxResource({
    params: () => (this.auth.isLoggedIn() ? { token: this.auth.token(), user: this.auth.username() } : undefined),
    stream: () => this.decksApi.listAllMine(),
  });
  private readonly serverDecks = computed(() => (this.serverRes.hasValue() ? this.serverRes.value() : []));
  protected readonly serverError = computed(() => {
    const err = this.serverRes.error();
    if (!err) return null;
    return (err as { status?: number }).status === 401
      ? $localize`:@@decks.page.sessionExpired:Session expirée : les decks du compte ne peuvent pas être chargés (401).`
      : $localize`:@@decks.page.accountDecksUnavailable:Decks du compte indisponibles.`;
  });
  protected readonly mine = computed(() => [...this.guests.decks(), ...this.serverDecks()].map(toDeckListItem));
  protected readonly mineFiltered = computed(() => filterDecks(this.mine(), this.filters()));

  /** Starter Deck Contest snapshot, loaded the first time the tab opens. */
  private readonly contestRes = rxResource({
    params: () => (this.tab() === 'contest' ? true : undefined),
    stream: () => from(loadContestDecks()),
  });
  private readonly contestAll = linkedSignal<DeckListItem[] | undefined, DeckListItem[]>({
    source: () => (this.contestRes.hasValue() ? this.contestRes.value() : undefined),
    computation: (items, prev) => items ?? prev?.value ?? [],
  });
  protected readonly contestSet = signal<ContestSet>('winners');
  private readonly contestInSet = computed(() => contestDecksFor(this.contestAll(), this.contestSet()));
  protected readonly contestSets = [
    { value: 'winners' as ContestSet, label: $localize`:@@decks.contest.winners:Gagnants` },
    { value: 'all' as ContestSet, label: $localize`:@@decks.contest.all:Toutes les decklists` },
  ];

  /** API query for the community tab; `undefined` on the other tabs (resource idle). */
  private readonly communityQuery = computed(
    () => (this.tab() === 'community' ? toCommunityQuery(this.filters()) : undefined),
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
    { query: CommunityQuery | undefined; loaded: { query: CommunityQuery | undefined; page: number; res: PublicDeckPage } | undefined },
    CommunityState
  >({
    source: () => ({ query: this.communityQuery(), loaded: this.communityRes.hasValue() ? this.communityRes.value() : undefined }),
    computation: ({ query, loaded }, prev) => {
      const current = prev && prev.source.query === query ? prev.value : EMPTY_COMMUNITY;
      if (!loaded || loaded.query !== query || loaded.page <= current.page) return current;
      return addCommunityPage(current, query, loaded.page, loaded.res);
    },
  });
  protected readonly community = computed(() => this.communityState().items);
  protected readonly communityTotal = computed(() => this.communityState().total);
  /** Every page of the query is loaded. */
  private readonly communityComplete = computed(() => {
    const { page, lastPage } = this.communityState();
    return page > 0 && page >= lastPage;
  });
  protected readonly communityLoading = computed(() => this.communityRes.isLoading());
  protected readonly communityError = computed(() => (this.communityRes.error() ? $localize`:@@decks.page.communityError:Impossible de charger les decks publics.` : null));
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
    const tab = this.tab();
    // The contest keeps the order of the snapshot, whatever the sort chosen on the other tabs.
    if (tab === 'contest') return matchDecks(this.contestInSet(), { ...this.filters(), format: '', visibility: 'all' });
    return (tab === 'mine' ? this.mineFiltered() : this.community()).map((d) => (likes[d.id] ? { ...d, ...likes[d.id] } : d));
  });
  protected readonly tabs = computed(() => [
    { id: 'mine', label: $localize`:@@decks.page.tabMine:Mes decks · ${this.mine().length}:count:` },
    { id: 'community', label: $localize`:@@decks.page.tabCommunity:Communauté` },
    { id: 'contest', label: $localize`:@@decks.page.tabContest:Concours deck de démarrage` },
  ]);
  protected readonly contestLoading = computed(() => this.contestRes.isLoading());
  protected readonly contestError = computed(() =>
    this.contestRes.error() ? $localize`:@@decks.contest.error:Impossible de charger les decks du concours.` : null,
  );
  protected readonly formats = [{ value: '', label: $localize`:@@decks.page.allFormats:Tous les formats` }, ...DECK_FORMATS.map((f) => ({ value: f.value, label: f.label }))];
  protected readonly heroes = computed(() => this.heroOptions(this.filters().factions));
  /** On the contest tab, the heroes of the set and of the selected factions (as on the site's decks page). */
  private heroOptions(factions: string[]): { value: string; label: string }[] {
    const decks =
      this.tab() === 'contest'
        ? this.contestInSet().filter((d) => !factions.length || (!!d.hero && factions.includes(d.hero.faction)))
        : this.mine();
    const names = [...new Set(decks.map((d) => d.hero?.name).filter((n): n is string => !!n))].sort((a, b) => a.localeCompare(b, uiLocale()));
    return [{ value: '', label: $localize`:@@decks.page.allHeroes:Tous les héros` }, ...names.map((n) => ({ value: n, label: n }))];
  }
  protected readonly visibilities = [
    { value: 'all' as Visibility, label: $localize`:@@decks.page.visibilityAll:Tous` },
    { value: 'public' as Visibility, label: $localize`:@@decks.page.visibilityPublic:Publics` },
    { value: 'private' as Visibility, label: $localize`:@@decks.page.visibilityPrivate:Privés` },
  ];
  protected readonly sorts = SORTS;
  protected readonly factions = FACTIONS;
  protected readonly activeFilters = computed(() => {
    const f = this.filters();
    const tab = this.tab();
    return (f.format && tab !== 'contest' ? 1 : 0) + (f.hero && tab !== 'community' ? 1 : 0) + (f.visibility !== 'all' && tab === 'mine' ? 1 : 0) + f.factions.length;
  });
  protected readonly countLabel = computed(() => {
    const community = this.tab() === 'community';
    const n = community ? this.communityTotal() ?? this.list().length : this.list().length;
    const count = n.toLocaleString(uiLocale());
    // Several factions: no total from the API, only the matching decks of the pages loaded so far.
    if (community && this.communityTotal() == null && n > 0 && !this.communityComplete()) return $localize`:@@decks.page.countAtLeast:${count}:count:+ decks`;
    // French puts 0 in the singular, English in the plural.
    const plural = uiLocale() === 'fr' ? n > 1 : n !== 1;
    return plural ? $localize`:@@decks.page.countMany:${count}:count: decks` : $localize`:@@decks.page.countOne:${count}:count: deck`;
  });
  protected readonly filtersLabel = computed(() => {
    const active = this.activeFilters();
    return active ? $localize`:@@decks.page.filtersActive:Filtres, ${active}:count: actifs` : $localize`:@@decks.page.filters:Filtres`;
  });
  protected readonly listLabel = computed(() => {
    const tab = this.tab();
    if (tab === 'contest') return $localize`:@@decks.page.contestList:Decks du concours deck de démarrage`;
    return tab === 'mine' ? $localize`:@@decks.page.mineList:Mes decks` : $localize`:@@decks.page.communityList:Decks de la communauté`;
  });

  constructor() {
    this.guests.reload();
    // Contest tab: its filters come from the URL (`set`, `faction`, `hero`, `q`) and are kept there,
    // so a filtered list can be shared, as on the site's decks page.
    // The site's links are understood too: `set=collection`, `hero=` a hero reference.
    const initial = this.route.snapshot.queryParamMap;
    if (initial.get('tab') === 'contest') {
      if (initial.get('set') === 'all' || initial.get('set') === 'collection') this.contestSet.set('all');
      const factions = (initial.get('faction') ?? '').toUpperCase().split(',').filter((c) => FACTIONS.some((f) => f.code === c));
      this.filters.update((f) => ({ ...f, factions, hero: initial.get('hero') ?? '', q: initial.get('q') ?? '' }));
    }
    // Once the snapshot is loaded, a hero of the URL becomes a name of the list, or is dropped.
    effect(() => {
      const all = this.contestAll();
      if (this.tab() !== 'contest' || !all.length) return;
      untracked(() => {
        const hero = this.filters().hero;
        if (!hero || this.heroes().some((o) => o.value === hero)) return;
        const byRef = this.contestInSet().find((d) => d.hero?.reference === hero.toUpperCase())?.hero?.name;
        this.patch({ hero: byRef && this.heroes().some((o) => o.value === byRef) ? byRef : '' });
      });
    });
    // The contest keeps its own filters, apart from « Mes decks » and « Communauté » (as on the site).
    let shownGroup = this.tab() === 'contest' ? 'contest' : 'decks';
    const saved: Record<string, DeckFilters> = {};
    effect(() => {
      const group = this.tab() === 'contest' ? 'contest' : 'decks';
      untracked(() => {
        if (group === shownGroup) return;
        saved[shownGroup] = this.filters();
        this.filters.set(saved[group] ?? EMPTY_DECK_FILTERS);
        shownGroup = group;
      });
    });
    effect(() => {
      if (this.tab() !== 'contest') return;
      const f = this.filters();
      const queryParams = {
        tab: 'contest',
        set: this.contestSet() === 'all' ? 'all' : null,
        faction: f.factions.join(',') || null,
        hero: f.hero || null,
        q: f.q.trim() || null,
      };
      untracked(() => void this.router.navigate([], { queryParams, replaceUrl: true }));
    });
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
    const tab = TABS.find((t) => t === id) ?? 'mine';
    // Only `tab` is kept: the contest filters of the URL do not follow to the other tabs.
    void this.router.navigate([], { queryParams: { tab: tab === 'mine' ? null : tab }, replaceUrl: true });
  }

  protected patch(p: Partial<DeckFilters>): void {
    this.filters.update((f) => ({ ...f, ...p }));
  }

  /** The hero filter is dropped when the other set has no deck with that hero. */
  protected setContestSet(set: ContestSet | undefined): void {
    this.contestSet.set(set ?? 'winners');
    const hero = this.filters().hero;
    if (hero && !this.contestInSet().some((d) => d.hero?.name === hero)) this.patch({ hero: '' });
  }

  protected toggleFaction(code: string, on: boolean): void {
    // On the contest tab the hero list follows the factions, so the hero is cleared (as on the site).
    const hero = this.tab() === 'contest' ? '' : undefined;
    this.filters.update((f) => ({ ...f, ...(hero === undefined ? {} : { hero }), factions: on ? [...f.factions, code] : f.factions.filter((c) => c !== code) }));
  }

  protected newDeck(): void {
    openNewDeck(this.overlay).afterClosed.subscribe((res) => {
      if (!res) return;
      this.store.createDeck(res).subscribe((deck) => void this.router.navigate(['/decks', deck.id, 'edit']));
    });
  }

  protected importDeck(): void {
    // Signed in, the window opens on the altered.gg export (the site shows its import link to
    // signed-in users only). Both imports make account decks when signed in, a guest deck otherwise.
    openImportDeck(this.overlay, this.auth.isLoggedIn() ? 'equinox' : 'list').afterClosed.subscribe((res) => {
      // The export import creates account decks even when the window is closed with its cross mid-import,
      // and the list stays alive behind the deck page (DecksListReuseStrategy): reload it either way.
      if (this.auth.isLoggedIn()) this.serverRes.reload();
      if (res?.deckId) void this.router.navigate(['/decks', res.deckId]);
    });
  }

  protected openFilters(): void {
    this.overlay
      .open<DeckFiltersSheet, DeckFilters>(DeckFiltersSheet, {
        title: $localize`:@@decks.page.filters:Filtres`,
        data: {
          filters: this.filters(),
          formats: this.formats,
          heroes: this.heroes(),
          heroesFor: (factions: string[]) => this.heroOptions(factions),
          clearHeroOnFaction: this.tab() === 'contest',
          visibilities: this.visibilities,
          showFormat: this.tab() !== 'contest',
          showHero: this.tab() !== 'community',
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
