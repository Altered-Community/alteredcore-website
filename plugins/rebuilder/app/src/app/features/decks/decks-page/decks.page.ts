import { Component, DestroyRef, ElementRef, computed, effect, inject, linkedSignal, signal, untracked, viewChild } from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterLink } from '@angular/router';
import { concatMap, finalize, from, map, switchMap, timer, toArray } from 'rxjs';
import { AuthSession } from '../../../core/auth-session';
import { CommunityBuildersService } from '../../../core/community-builders.service';
import { factionFromReference, toDeckListItem, type DeckListItem } from '../../../core/deck-view';
import { DecksApiService, type PublicDeckPage } from '../../../core/decks-api.service';
import { DECK_FORMATS } from '../../../core/formats';
import { GuestDeckService } from '../../../core/guest-deck.service';
import { uiLocale } from '../../../core/i18n';
import { contentLocale } from '../../../core/locale';
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
import { openLegalityDetails } from '../../shared/legality-details/legality-details.overlay';
import { openCommunityBuilders } from '../community-builders/community-builders.overlay';
import { isDecksListUrl } from '../decks-list-reuse';
import { openImportDeck } from '../import-deck/import-deck.overlay';
import { type Visibility, type DeckFilters, type DeckSort, type HeroChoice, EMPTY_DECK_FILTERS, filterDecks, heroOptions, matchDecks } from '../deck-filters';
import { DeckFiltersSheet } from '../deck-filters-sheet/deck-filters-sheet';
import { type ContestSet, contestDecksFor, loadContestDecks } from '../contest/contest-decks';
import { type CommunityQuery, type CommunityState, EMPTY_COMMUNITY, addCommunityPage, toCommunityQuery } from '../community-pages';

type Tab = 'mine' | 'community' | 'contest';

const TABS: readonly Tab[] = ['mine', 'community', 'contest'];

const SEARCH_DEBOUNCE_MS = 300;

function tabFromParam(value: string | null): Tab | undefined {
  if (value === 'my') return 'mine';
  if (value === 'public') return 'community';
  return TABS.find((t) => t === value);
}

/** The site's `sort` values (`field:dir`) and Re:Builder's. */
const SITE_SORTS: Record<string, DeckSort> = {
  'updatedAt:desc': 'updated',
  'updatedAt:asc': 'updated-asc',
  'createdAt:desc': 'created',
  'createdAt:asc': 'created-asc',
  'name:asc': 'name',
  'name:desc': 'name-desc',
  'upvoteCount:desc': 'likes',
};

function sortFromParam(value: string | null): DeckSort | undefined {
  if (!value) return undefined;
  return SITE_SORTS[value] ?? SORTS.find((s) => s.value === value)?.value;
}

const SORTS: { value: DeckSort; label: string }[] = [
  { value: 'updated', label: $localize`:@@decks.page.sortUpdated:Récemment modifié` },
  { value: 'updated-asc', label: $localize`:@@decks.page.sortUpdatedAsc:Plus ancien modifié` },
  { value: 'created', label: $localize`:@@decks.page.sortCreated:Récemment créé` },
  { value: 'created-asc', label: $localize`:@@decks.page.sortCreatedAsc:Plus ancien créé` },
  { value: 'likes', label: $localize`:@@decks.page.sortLikes:Les plus aimés` },
  { value: 'name', label: $localize`:@@decks.page.sortName:Nom` },
  { value: 'name-desc', label: $localize`:@@decks.page.sortNameDesc:Nom Z→A` },
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
  /** The site's community deckbuilders: a banner above the tabs on wide screens, as on the site's decks page. */
  protected readonly builders = toSignal(inject(CommunityBuildersService).list(), { initialValue: [] });

  /** `?tab=`, with the site's names too (`my`, `public`). */
  private readonly queryTab = toSignal(this.route.queryParamMap.pipe(map((q) => tabFromParam(q.get('tab')))), { initialValue: undefined });
  /** A guest without decks on this device lands on « Communauté », as on the site's decks page. */
  private readonly defaultTab = computed<Tab>(() =>
    !this.auth.isLoggedIn() && !this.auth.sessionRestoring() && !this.guests.decks().length ? 'community' : 'mine',
  );
  protected readonly tab = computed<Tab>(() => this.queryTab() ?? this.defaultTab());
  /** Bumped when the list is shown again, so its filters go back to the URL. */
  private readonly urlSync = signal(0);
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
  /** Signed in with decks left from guest mode on this device (Re:Builder's, or the site builder's): offered for the account. */
  protected readonly localDecks = computed(() => (this.auth.isLoggedIn() ? this.guests.decks() : []));
  protected readonly localDecksLabel = computed(() => {
    const decks = this.localDecks();
    if (decks.length !== 1) return $localize`:@@decks.local.many:Vous avez ${decks.length}:count: decks sauvegardés en mode invité sur cet appareil.`;
    const d = toDeckListItem(decks[0]);
    return $localize`:@@decks.local.one:${d.name}:name: — ${d.total}:count: cartes — Vous avez un deck sauvegardé en mode invité.`;
  });
  protected readonly localSaving = signal(false);
  protected readonly localError = signal<string | null>(null);
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
  protected readonly communityComplete = computed(() => {
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
  /** Heroes that have public decks, loaded the first time the community tab opens. */
  private readonly publicHeroesRes = rxResource({
    params: () => (this.tab() === 'community' ? contentLocale() : undefined),
    stream: ({ params }) => this.decksApi.publicHeroes(params),
  });
  private readonly publicHeroes = linkedSignal<HeroChoice[] | undefined, HeroChoice[]>({
    source: () =>
      this.publicHeroesRes.hasValue()
        ? this.publicHeroesRes.value().map((h) => ({ value: h.reference, label: h.name, faction: factionFromReference(h.reference) }))
        : undefined,
    computation: (heroes, prev) => heroes ?? prev?.value ?? [],
  });
  protected readonly heroes = computed(() => this.heroOptions(this.filters().factions));
  /**
   * Hero filter options, grouped by faction (as on the site's decks page). Community tab: the heroes of the public decks,
   * by reference (the API filters on it). Contest tab: the heroes of the set. Mine: the heroes of the account's decks.
   */
  private heroOptions(factions: string[]): { value: string; label: string; group?: string }[] {
    const all = $localize`:@@decks.page.allHeroes:Tous les héros`;
    if (this.tab() === 'community') return heroOptions(this.publicHeroes(), factions, all);
    const decks = this.tab() === 'contest' ? this.contestInSet() : this.mine();
    const byName = new Map<string, HeroChoice>();
    for (const d of decks) if (d.hero?.name && !byName.has(d.hero.name)) byName.set(d.hero.name, { value: d.hero.name, label: d.hero.name, faction: d.hero.faction });
    const choices = [...byName.values()].sort((a, b) => a.label.localeCompare(b.label, uiLocale()));
    return heroOptions(choices, factions, all);
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
    return (f.format && tab !== 'contest' ? 1 : 0) + (f.hero ? 1 : 0) + (f.visibility !== 'all' && tab === 'mine' ? 1 : 0) + f.factions.length;
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
    // Filters and sort come from the URL and are kept there, so a filtered list can be shared, as on the site's decks
    // page. The site's links are understood too: `set=collection`, `hero=` a hero reference, `visibility=1|0`,
    // `sort=field:dir`, `tab=my|public`.
    const initial = this.route.snapshot.queryParamMap;
    const factions = (initial.get('faction') ?? '').toUpperCase().split(',').filter((c) => FACTIONS.some((f) => f.code === c));
    const hero = initial.get('hero') ?? '';
    const q = initial.get('q') ?? '';
    if (this.tab() === 'contest') {
      if (initial.get('set') === 'all' || initial.get('set') === 'collection') this.contestSet.set('all');
      this.filters.update((f) => ({ ...f, factions, hero, q }));
    } else {
      const format = initial.get('format') ?? '';
      const vis = initial.get('visibility');
      const visibility: Visibility = vis === 'public' || vis === '1' ? 'public' : vis === 'private' || vis === '0' ? 'private' : 'all';
      this.filters.set({
        q,
        format: DECK_FORMATS.some((f) => f.value === format) ? format : '',
        hero: this.tab() === 'community' ? hero.toUpperCase() : hero,
        visibility: this.tab() === 'mine' ? visibility : 'all',
        factions,
        sort: sortFromParam(initial.get('sort')) ?? 'updated',
      });
    }
    // « Mes decks »: a hero reference of the URL (site link) becomes the name of that hero once the decks are loaded.
    effect(() => {
      const mine = this.mine();
      if (this.tab() !== 'mine' || !this.serverRes.hasValue()) return;
      untracked(() => {
        const hero = this.filters().hero;
        if (!/^ALT_/i.test(hero)) return;
        const ref = hero.toUpperCase();
        const base = ref.replace(/^(ALT_[^_]+)_[BP]_/, '$1_');
        const match = mine.find((d) => d.hero && (d.hero.reference === ref || d.hero.reference.replace(/^(ALT_[^_]+)_[BP]_/, '$1_') === base));
        this.patch({ hero: match?.hero?.name ?? '' });
      });
    });
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
    // « Mes decks » filters on the hero's name, « Communauté » on its reference: the hero does not follow a tab change.
    let heroTab = this.tab();
    effect(() => {
      const tab = this.tab();
      untracked(() => {
        if (tab !== heroTab && tab !== 'contest' && heroTab !== 'contest' && this.filters().hero) this.patch({ hero: '' });
        heroTab = tab;
      });
    });
    effect(() => {
      this.urlSync();
      const tab = this.tab();
      const f = this.filters();
      const common = { faction: f.factions.join(',') || null, hero: f.hero || null, q: f.q.trim() || null };
      const queryParams =
        tab === 'contest'
          ? { tab, set: this.contestSet() === 'all' ? 'all' : null, ...common }
          : {
              tab: tab === this.defaultTab() ? null : tab,
              format: f.format || null,
              ...common,
              visibility: tab === 'mine' && f.visibility !== 'all' ? f.visibility : null,
              sort: f.sort !== 'updated' ? f.sort : null,
            };
      untracked(() => {
        if (!isDecksListUrl(this.router.url)) return;
        const current = this.route.snapshot.queryParamMap;
        const same = Object.entries(queryParams).every(([k, v]) => current.get(k) === v) && current.keys.every((k) => k in queryParams);
        if (!same) void this.router.navigate([], { relativeTo: this.route, queryParams, replaceUrl: true });
      });
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
      if (e instanceof NavigationEnd && isDecksListUrl(e.urlAfterRedirects)) this.urlSync.update((n) => n + 1);
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
    // Only `tab` is kept: the URL effect then writes the filters of the tab shown.
    void this.router.navigate([], { queryParams: { tab: tab === this.defaultTab() ? null : tab }, replaceUrl: true });
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
    // On the contest tab the hero list follows the factions, so the hero is cleared (as on the site). Elsewhere the
    // hero stays while the list still offers it.
    this.filters.update((f) => {
      const factions = on ? [...f.factions, code] : f.factions.filter((c) => c !== code);
      const keep = this.tab() !== 'contest' && (!f.hero || this.heroOptions(factions).some((o) => o.value === f.hero));
      return { ...f, hero: keep ? f.hero : '', factions };
    });
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

  /** « Non légal » on a deck tile: the deck's rules window, as on the site's decks page. */
  protected showLegality(deck: DeckListItem): void {
    openLegalityDetails(this.overlay, { format: deck.formatLabel, legality: deck.legality });
  }

  /** « Enregistrer sur mon compte »: each guest deck becomes a private draft of the account, then leaves this device. */
  protected saveLocalDecks(): void {
    const decks = this.localDecks();
    if (!decks.length || this.localSaving()) return;
    this.localSaving.set(true);
    this.localError.set(null);
    from(decks)
      .pipe(
        concatMap((d) =>
          this.decksApi
            .create({
              name: d.name,
              description: d.description ?? '',
              format: d.format,
              isPublic: false,
              isDraft: true,
              deckCards: [
                ...(d.hero ? [{ cardReference: d.hero.reference, quantity: 1 }] : []),
                ...(d.deckCards ?? []).filter((l) => l.cardReference !== d.hero?.reference).map((l) => ({ cardReference: l.cardReference, quantity: l.quantity })),
              ],
            })
            .pipe(
              map((created) => {
                this.guests.forgetSiteDeck(d.id);
                this.guests.delete(d.id);
                return created;
              }),
            ),
        ),
        toArray(),
        finalize(() => this.localSaving.set(false)),
      )
      .subscribe({
        next: (created) => {
          this.serverRes.reload();
          if (created.length === 1) void this.router.navigate(['/decks', created[0].id]);
        },
        error: () => {
          this.serverRes.reload();
          this.localError.set($localize`:@@decks.local.error:Impossible d’enregistrer le deck sur votre compte. Réessayez.`);
        },
      });
  }

  /** « Ignorer »: the guest decks are deleted from this device, after a confirmation (as on the site). */
  protected discardLocalDecks(): void {
    if (!confirm($localize`:@@decks.local.discardConfirm:Supprimer les decks locaux ? Cette action est irréversible.`)) return;
    for (const d of this.localDecks()) this.guests.delete(d.id);
  }

  protected showBuilders(): void {
    openCommunityBuilders(this.overlay, this.builders());
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
          showHero: true,
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
