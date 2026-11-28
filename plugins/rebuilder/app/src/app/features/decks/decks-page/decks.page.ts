import { Component, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AuthSession } from '../../../core/auth-session';
import { CommunityBuildersService } from '../../../core/community-builders.service';
import { DeckStore } from '../../../core/deck-store';
import type { DeckListItem } from '../../../core/deck-view';
import { visibleFormats } from '../../../core/formats';
import { GuestDeckService } from '../../../core/guest-deck.service';
import { uiLocale } from '../../../core/i18n';
import { AcButton, AcIconButton } from '../../../ui/buttons';
import { AcSkeleton } from '../../../ui/containers';
import { AcChip, AcCount } from '../../../ui/chips';
import { type AcSegment, type AcSuggestion, AcAutocomplete, AcInput, AcSegmented, AcSelect, AcSwitch } from '../../../ui/fields';
import { AcIcon } from '../../../ui/icon';
import { AcInfiniteSentinel } from '../../../ui/infinite';
import { AcBreakpointService } from '../../../ui/layout.services';
import { AcDeckCard, FACTIONS } from '../../../ui/metier';
import { AcAppBar, AcBottomNav, AcTabs, attachScrollPreservation, type AcBottomNavItem } from '../../../ui/nav';
import { AcOverlayService } from '../../../ui/overlay';
import { openConfirm } from '../../shared/confirm/confirm.overlay';
import { openLegalityDetails } from '../../shared/legality-details/legality-details.overlay';
import { openNewDeck } from '../../shared/new-deck/new-deck.overlay';
import { openCommunityBuilders } from '../community-builders/community-builders.overlay';
import type { ContestSet } from '../contest/contest-decks';
import { EMPTY_DECK_FILTERS, type DeckFilters, type DeckStatus, type Visibility } from '../deck-filters';
import { DeckFiltersSheet, type DeckFiltersResult } from '../deck-filters-sheet/deck-filters-sheet';
import { DecksCatalogStore, cardOption } from '../decks-catalog.store';
import { isDecksListUrl } from '../decks-list-reuse';
import { decodeDecksUrl, encodeDecksUrl, queryParamsEqual, SORTS, tabFromParam, tabQueryParams, TABS, type Tab } from '../decks-url-codec';
import { openImportDeck } from '../import-deck/import-deck.overlay';

export { cardOption };

@Component({
  selector: 'app-decks-page',
  providers: [DecksCatalogStore],
  imports: [RouterLink, AcAppBar, AcBottomNav, AcTabs, AcButton, AcIconButton, AcInput, AcAutocomplete, AcSelect, AcSegmented, AcSwitch, AcChip, AcDeckCard, AcIcon, AcCount, AcInfiniteSentinel, AcSkeleton],
  templateUrl: './decks.page.html',
  styleUrl: './decks.page.scss',
})
export class DecksPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly overlay = inject(AcOverlayService);
  private readonly guests = inject(GuestDeckService);
  private readonly store = inject(DeckStore);
  private readonly catalog = inject(DecksCatalogStore);
  protected readonly auth = inject(AuthSession);
  protected readonly bp = inject(AcBreakpointService);
  /** The site's community deckbuilders: a banner above the tabs on wide screens, as on the site's decks page. */
  protected readonly builders = toSignal(inject(CommunityBuildersService).list(), { initialValue: [] });

  /** `?tab=`, with the site's names too (`my`, `public`). */
  private readonly queryTab = toSignal(this.route.queryParamMap.pipe(map((q) => tabFromParam(q.get('tab')))), { initialValue: undefined });
  /** A guest without decks on this device lands on « Communauté », as on the site's decks page. */
  private readonly defaultTab = computed<Tab>(() =>
    !this.auth.isLoggedIn() && !this.auth.sessionRestoring() && !this.guests.decks().length ? 'community' : 'mine',
  );
  protected readonly tab = computed<Tab>(() => this.queryTab() ?? this.defaultTab());
  /** « Mes decks »: a deck opens in the editor, on « Aperçu »; elsewhere on its page. */
  protected readonly openInEditor = computed(() => this.tab() === 'mine');
  /** Bumped when the list is shown again, so its filters go back to the URL. */
  private readonly urlSync = signal(0);
  private readonly listSentinel = viewChild<ElementRef<HTMLElement>>('listSentinel');

  protected readonly filters = this.catalog.filters;
  protected readonly mineLoading = this.catalog.mineLoading;
  protected readonly listLoading = this.catalog.listLoading;
  protected readonly serverError = this.catalog.serverError;
  protected readonly mine = this.catalog.mine;
  protected readonly localDecks = this.catalog.localDecks;
  protected readonly localDecksLabel = this.catalog.localDecksLabel;
  protected readonly localSaving = this.catalog.localSaving;
  protected readonly localError = this.catalog.localError;
  protected readonly contestSet = this.catalog.contestSet;
  protected readonly contestLoading = this.catalog.contestLoading;
  protected readonly contestError = this.catalog.contestError;
  protected readonly communityTotal = this.catalog.communityTotal;
  protected readonly communityComplete = this.catalog.communityComplete;
  protected readonly communityLoading = this.catalog.communityLoading;
  protected readonly communityError = this.catalog.communityError;
  protected readonly list = this.catalog.list;
  protected readonly heroes = this.catalog.heroes;
  protected readonly cardOptions = this.catalog.cardOptions;
  protected readonly cardSuggesting = this.catalog.cardSuggesting;
  protected readonly cardChoice = this.catalog.cardChoice;

  /**
   * Two rows of deck cards from 768 px, a screen of rows on phones. Keyed by the list's length: decks that arrive
   * above them take new skeletons below, rather than pushing the same ones down (a layout shift for the browser).
   */
  protected readonly skeletons = computed(() => {
    const listed = this.list().length;
    return Array.from({ length: this.bp.compact() ? 5 : 10 }, (_, i) => `${listed}-${i}`);
  });

  protected readonly contestSets = [
    { value: 'winners' as ContestSet, label: $localize`:@@decks.contest.winners:Gagnants` },
    { value: 'all' as ContestSet, label: $localize`:@@decks.contest.all:Toutes les decklists` },
  ];
  protected readonly tabs = computed(() => [
    { id: 'mine', label: $localize`:@@decks.page.tabMine:Mes decks`, count: this.mineLoading() ? null : this.mine().length },
    { id: 'community', label: $localize`:@@decks.page.tabCommunity:Communauté` },
    { id: 'contest', label: $localize`:@@decks.page.tabContest:Concours deck de démarrage` },
  ]);
  /** Compact: the tabs are a bottom navigation, as in the editor and the deck page. */
  protected readonly navItems = computed<AcBottomNavItem[]>(() => {
    const item = (tab: Tab, icon: AcBottomNavItem['icon'], label: string): AcBottomNavItem => ({
      route: '.',
      queryParams: tabQueryParams(tab, this.defaultTab()),
      active: this.tab() === tab,
      icon,
      label,
    });
    return [
      item('mine', 'layers', $localize`:@@decks.nav.mine:Mes decks`),
      item('community', 'users', $localize`:@@decks.page.tabCommunity:Communauté`),
      item('contest', 'trophy', $localize`:@@decks.nav.contest:Concours`),
    ];
  });
  protected readonly formats = [{ value: '', label: $localize`:@@decks.page.allFormats:Tous les formats` }, ...visibleFormats().map((f) => ({ value: f.value, label: f.label }))];
  protected readonly visibilities: AcSegment<Visibility>[] = [
    { value: 'all', label: $localize`:@@decks.page.visibilityAll:Tous` },
    { value: 'public', icon: 'eye', label: $localize`:@@decks.page.visibilityPublic:Publics` },
    { value: 'private', icon: 'lock', label: $localize`:@@decks.page.visibilityPrivate:Privés` },
  ];
  protected readonly statuses: AcSegment<DeckStatus>[] = [
    { value: 'active', label: $localize`:@@decks.page.statusActive:Actifs` },
    { value: 'archived', icon: 'archive', label: $localize`:@@decks.page.statusArchived:Archivés` },
  ];
  protected readonly sorts = SORTS;
  protected readonly factions = FACTIONS;

  protected readonly activeFilters = computed(() => {
    const f = this.filters();
    const tab = this.tab();
    // « Légaux uniquement » is on by default: turned off, it counts as a filter.
    return (
      (f.format && tab !== 'contest' ? 1 : 0) +
      (f.hero ? 1 : 0) +
      (f.visibility !== 'all' && tab === 'mine' ? 1 : 0) +
      (f.status === 'archived' && tab === 'mine' ? 1 : 0) +
      (!f.legalOnly && tab === 'community' ? 1 : 0) +
      (tab === 'community' ? (f.tournament ? 1 : 0) + (f.card ? 1 : 0) : 0) +
      f.factions.length
    );
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
    const initialTab = this.tab();
    this.catalog.tab.set(initialTab);
    const decoded = decodeDecksUrl(this.route.snapshot.queryParamMap, initialTab);
    this.catalog.contestSet.set(decoded.contestSet);
    this.catalog.filters.set(decoded.filters);

    effect(() => {
      this.catalog.tab.set(this.tab());
    });

    // The contest keeps its own filters, apart from « Mes decks » and « Communauté » (as on the site).
    let shownGroup = initialTab === 'contest' ? 'contest' : 'decks';
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
    let heroTab = initialTab;
    effect(() => {
      const tab = this.tab();
      untracked(() => {
        if (tab !== heroTab && tab !== 'contest' && heroTab !== 'contest' && this.filters().hero) this.patch({ hero: '' });
        heroTab = tab;
      });
    });
    effect(() => {
      this.urlSync();
      const queryParams = encodeDecksUrl(this.tab(), this.defaultTab(), this.filters(), this.contestSet());
      untracked(() => {
        if (!isDecksListUrl(this.router.url)) return;
        if (!queryParamsEqual(this.route.snapshot.queryParamMap, queryParams)) {
          void this.router.navigate([], { relativeTo: this.route, queryParams, replaceUrl: true });
        }
      });
    });

    attachScrollPreservation({
      isTargetUrl: isDecksListUrl,
      onLeave: () => this.catalog.wantMore.set(false),
      onRouteMatch: () => this.urlSync.update((n) => n + 1),
      onReturn: () => this.catalog.reloadMine(),
      onRestored: () => this.syncSentinel(),
    });
  }

  /** Re-arm infinite scroll after the list view is reattached (the observer may not emit on its own). */
  private syncSentinel(): void {
    const el = this.listSentinel()?.nativeElement;
    if (!el || this.tab() !== 'community') return;
    const rect = el.getBoundingClientRect();
    const lookahead = window.innerHeight * 3;
    this.catalog.wantMore.set(rect.top < window.innerHeight + lookahead && rect.bottom > 0);
  }

  protected setTab(id: string): void {
    const tab = TABS.find((t) => t === id) ?? 'mine';
    void this.router.navigate([], { queryParams: tabQueryParams(tab, this.defaultTab()), replaceUrl: true });
  }

  protected patch(p: Partial<DeckFilters>): void {
    this.catalog.patchFilters(p);
  }

  protected setCard(choice: AcSuggestion | null): void {
    this.catalog.setCard(choice);
  }

  protected onCardQuery(q: string): void {
    this.catalog.setCardQuery(q);
  }

  protected setContestSet(set: ContestSet | undefined): void {
    this.catalog.setContestSet(set);
  }

  protected toggleFaction(code: string, on: boolean): void {
    this.catalog.toggleFaction(code, on);
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
      this.catalog.reloadMine();
      if (res?.deckId) void this.router.navigate(['/decks', res.deckId]);
    });
  }

  /** « Non légal » on a deck tile: the deck's rules window, as on the site's decks page. */
  protected showLegality(deck: DeckListItem): void {
    openLegalityDetails(this.overlay, { format: deck.formatLabel, legality: deck.legality });
  }

  protected saveLocalDecks(): void {
    this.catalog.saveLocalDecks((id) => void this.router.navigate(['/decks', id]));
  }

  /** « Ignorer »: the guest decks are deleted from this device, after a confirmation (as on the site). */
  protected discardLocalDecks(): void {
    openConfirm(this.overlay, {
      title: $localize`:@@decks.local.discardTitle:Supprimer les decks locaux ?`,
      message: $localize`:@@decks.local.discardConfirm:Les decks enregistrés sur cet appareil seront supprimés. Cette action est irréversible.`,
      confirmLabel: $localize`:@@decks.local.discardAction:Supprimer`,
      icon: 'trash-2',
      danger: true,
    }).subscribe((confirmed) => {
      if (confirmed) this.catalog.discardLocalDecks();
    });
  }

  protected showBuilders(): void {
    openCommunityBuilders(this.overlay, this.builders());
  }

  protected openFilters(): void {
    this.overlay
      .open<DeckFiltersSheet, DeckFiltersResult>(DeckFiltersSheet, {
        title: $localize`:@@decks.page.filters:Filtres`,
        data: {
          filters: this.filters(),
          formats: this.formats,
          heroes: this.heroes(),
          heroesFor: (factions: string[]) => this.catalog.heroOptionsFor(factions),
          clearHeroOnFaction: this.tab() === 'contest',
          visibilities: this.visibilities,
          statuses: this.statuses,
          showFormat: this.tab() !== 'contest',
          showHero: true,
          showVisibility: this.tab() === 'mine',
          showLegalOnly: this.tab() === 'community',
          showCommunity: this.tab() === 'community',
          cardChoice: this.cardChoice(),
          suggestCards: (q: string) => this.catalog.suggestCards(q),
        },
      })
      .afterClosed.subscribe((res) => {
        if (!res) return;
        const { cardChoice, ...f } = res;
        this.catalog.pickedCard.set(cardChoice);
        this.filters.set(f);
      });
  }

  protected toggleLike(deck: DeckListItem): void {
    this.catalog.toggleLike(deck, () => void this.router.navigateByUrl('/login'));
  }

  protected onSentinel(visible: boolean): void {
    this.catalog.wantMore.set(visible);
  }
}
