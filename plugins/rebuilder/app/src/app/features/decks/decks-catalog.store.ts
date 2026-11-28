import { Service, computed, effect, inject, linkedSignal, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { concatMap, finalize, from, map, of, switchMap, timer, toArray } from 'rxjs';
import { AuthSession } from '../../core/auth-session';
import { CardCatalogService } from '../../core/card-catalog.service';
import type { CardSuggestion } from '../../core/card-suggestions';
import { guestDeckToWrite } from '../../core/deck-print-model';
import { factionFromReference, toDeckListItem, type DeckListItem } from '../../core/deck-view';
import { DecksApiService, type PublicDeckPage } from '../../core/decks-api.service';
import { GuestDeckService } from '../../core/guest-deck.service';
import { uiLocale } from '../../core/i18n';
import { contentLocale } from '../../core/locale';
import { rarityIcon } from '../../ui/chips/rarity';
import type { AcSuggestion } from '../../ui/fields';
import { addCommunityPage, EMPTY_COMMUNITY, toCommunityQuery, type CommunityQuery, type CommunityState } from './community-pages';
import { contestDecksFor, loadContestDecks, type ContestSet } from './contest/contest-decks';
import { EMPTY_DECK_FILTERS, filterDecks, heroOptions, matchDecks, type DeckFilters, type HeroChoice } from './deck-filters';
import type { Tab } from './decks-url-codec';

const SEARCH_DEBOUNCE_MS = 300;
/** Card filter: suggestions wait for a pause in the typing. */
const SUGGEST_DEBOUNCE_MS = 250;

type LikeState = Pick<DeckListItem, 'likes' | 'liked'>;

/** A card suggestion of the search API as an `ac-autocomplete` option: rarity (and « hors faction » for R2) on the right. */
export function cardOption(s: CardSuggestion): AcSuggestion {
  const rarity = rarityIcon(s.rarity).label;
  const meta = s.rarity === 'R2' ? $localize`:@@decks.cardFilter.outOfFaction:${rarity}:rarity: · hors faction` : rarity;
  return { value: s.reference, label: s.name, meta, thumb: s.image };
}

/**
 * Component-scoped data store for `DecksPage`: owns the three deck feeds (mine, community infinite
 * scroll, starter deck contest), hero & card autocomplete lookups, optimistic likes, and guest-to-account
 * deck migration. Keeps routing and overlays outside this store so it stays independently testable.
 */
@Service({ autoProvided: false })
export class DecksCatalogStore {
  private readonly decksApi = inject(DecksApiService);
  private readonly guests = inject(GuestDeckService);
  private readonly uniques = inject(CardCatalogService);
  private readonly auth = inject(AuthSession);

  /** Active tab, synced by `DecksPage` from route query params and guest/auth default. */
  readonly tab = signal<Tab>('mine');
  readonly filters = signal<DeckFilters>(EMPTY_DECK_FILTERS);
  readonly contestSet = signal<ContestSet>('winners');
  /** Whether the infinite-scroll sentinel is currently visible. */
  readonly wantMore = signal(false);

  /**
   * Account decks; follows the session, so logging in or out reloads them. Embedded in the site
   * there is no token in the browser (the relay adds it), hence the user name as the key.
   */
  private readonly serverRes = rxResource({
    params: () => (this.auth.isLoggedIn() ? { token: this.auth.token(), user: this.auth.username() } : undefined),
    stream: () => this.decksApi.listAllMine(),
  });
  /** Account decks on their way (first load, or another session): skeletons instead of the empty state. A reload keeps the list. */
  readonly mineLoading = computed(() => this.serverRes.status() === 'loading');
  private readonly serverDecks = computed(() => (this.serverRes.hasValue() ? this.serverRes.value() : []));
  readonly serverError = computed(() => {
    const err = this.serverRes.error();
    if (!err) return null;
    return (err as { status?: number }).status === 401
      ? $localize`:@@decks.page.sessionExpired:Session expirée : les decks du compte ne peuvent pas être chargés (401).`
      : $localize`:@@decks.page.accountDecksUnavailable:Decks du compte indisponibles.`;
  });
  readonly mine = computed(() => [...this.guests.decks(), ...this.serverDecks()].map(toDeckListItem));
  readonly mineFiltered = computed(() => {
    const archived = this.filters().status === 'archived';
    return filterDecks(
      this.mine().filter((d) => d.draft === archived),
      this.filters(),
    );
  });

  /** Signed in with decks left from guest mode on this device (Re:Builder's, or the site builder's): offered for the account. */
  readonly localDecks = computed(() => (this.auth.isLoggedIn() ? this.guests.decks() : []));
  readonly localDecksLabel = computed(() => {
    const decks = this.localDecks();
    if (decks.length !== 1) return $localize`:@@decks.local.many:Vous avez ${decks.length}:count: decks sauvegardés en mode invité sur cet appareil.`;
    const d = toDeckListItem(decks[0]);
    return $localize`:@@decks.local.one:${d.name}:name: — ${d.total}:count: cartes — Vous avez un deck sauvegardé en mode invité.`;
  });
  readonly localSaving = signal(false);
  readonly localError = signal<string | null>(null);

  /** Starter Deck Contest snapshot, loaded the first time the tab opens. */
  private readonly contestRes = rxResource({
    params: () => (this.tab() === 'contest' ? true : undefined),
    stream: () => from(loadContestDecks()),
  });
  readonly contestAll = linkedSignal<DeckListItem[] | undefined, DeckListItem[]>({
    source: () => (this.contestRes.hasValue() ? this.contestRes.value() : undefined),
    computation: (items, prev) => items ?? prev?.value ?? [],
  });
  readonly contestInSet = computed(() => contestDecksFor(this.contestAll(), this.contestSet()));
  readonly contestLoading = computed(() => this.contestRes.isLoading());
  readonly contestError = computed(() =>
    this.contestRes.error() ? $localize`:@@decks.contest.error:Impossible de charger les decks du concours.` : null,
  );

  /** API query for the community tab; `undefined` on the other tabs (resource idle). */
  private readonly communityQuery = computed(() => (this.tab() === 'community' ? toCommunityQuery(this.filters()) : undefined), {
    equal: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  });
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
  readonly community = computed(() => this.communityState().items);
  readonly communityTotal = computed(() => this.communityState().total);
  /** Every page of the query is loaded. */
  readonly communityComplete = computed(() => {
    const { page, lastPage } = this.communityState();
    return page > 0 && page >= lastPage;
  });
  readonly communityLoading = computed(() => this.communityRes.isLoading());
  readonly communityError = computed(() => (this.communityRes.error() ? $localize`:@@decks.page.communityError:Impossible de charger les decks publics.` : null));

  /** The open tab's list is loading: skeletons in its place, « Chargement… » for its count. */
  readonly listLoading = computed(() => {
    const tab = this.tab();
    return (tab === 'mine' && this.mineLoading()) || (tab === 'community' && this.communityLoading()) || (tab === 'contest' && this.contestLoading());
  });

  /** Likes toggled on this page, over what the API listed; dropped when the account changes. */
  private readonly likes = linkedSignal<string | null, Record<string, LikeState>>({
    source: () => this.auth.token() ?? this.auth.username(),
    computation: () => ({}),
  });
  private readonly pendingLikes = new Set<string>();

  readonly list = computed(() => {
    const likes = this.likes();
    const tab = this.tab();
    // The contest keeps the order of the snapshot, whatever the sort chosen on the other tabs.
    if (tab === 'contest') return matchDecks(this.contestInSet(), { ...this.filters(), format: '', visibility: 'all' });
    return (tab === 'mine' ? this.mineFiltered() : this.community()).map((d) => (likes[d.id] ? { ...d, ...likes[d.id] } : d));
  });

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
  readonly heroes = computed(() => this.heroOptionsFor(this.filters().factions));

  /** Text typed in the card filter; suggestions from the search API (`CardCatalogService.suggestCards`). */
  private readonly cardQuery = signal('');
  private readonly cardSuggestRes = rxResource({
    params: () => {
      const q = this.cardQuery().trim();
      return this.tab() === 'community' && q.length >= 2 ? { q, locale: contentLocale() } : undefined;
    },
    stream: ({ params }) => timer(SUGGEST_DEBOUNCE_MS).pipe(switchMap(() => this.uniques.suggestCards(params.q, params.locale))),
  });
  readonly cardOptions = linkedSignal<AcSuggestion[] | undefined, AcSuggestion[]>({
    source: () => (this.cardSuggestRes.hasValue() ? this.cardSuggestRes.value().map(cardOption) : undefined),
    computation: (options, prev) => options ?? prev?.value ?? [],
  });
  readonly cardSuggesting = computed(() => this.cardSuggestRes.isLoading());
  /** The suggestion picked in this page; a card of the URL is looked up (name, picture) on the search API. */
  readonly pickedCard = signal<AcSuggestion | null>(null);
  private readonly cardLookup = rxResource({
    params: () => {
      const ref = this.filters().card;
      return ref && this.pickedCard()?.value !== ref ? ref : undefined;
    },
    stream: ({ params }) => this.uniques.suggestionOf(params, contentLocale()).pipe(map((s) => (s ? cardOption(s) : null))),
  });
  readonly cardChoice = computed<AcSuggestion | null>(() => {
    const ref = this.filters().card;
    if (!ref) return null;
    const picked = this.pickedCard();
    if (picked?.value === ref) return picked;
    const found = this.cardLookup.hasValue() ? this.cardLookup.value() : null;
    return found ?? { value: ref, label: ref };
  });

  constructor() {
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
        this.patchFilters({ hero: match?.hero?.name ?? '' });
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
        this.patchFilters({ hero: byRef && this.heroes().some((o) => o.value === byRef) ? byRef : '' });
      });
    });
    // Keeps loading pages while the sentinel stays visible (fast scroll, tall screens).
    effect(() => {
      const { page, lastPage } = this.communityState();
      if (!this.wantMore() || this.communityLoading() || this.communityError() || page === 0 || page >= lastPage) return;
      untracked(() => this.communityPage.set(page + 1));
    });
  }

  /** Reloads account decks when signed in (e.g. returning from editor or after import). */
  reloadMine(): void {
    if (this.auth.isLoggedIn()) this.serverRes.reload();
  }

  patchFilters(p: Partial<DeckFilters>): void {
    this.filters.update((f) => ({ ...f, ...p }));
  }

  /** Card filter: a suggestion picked, or cleared (typing again clears it too). */
  setCard(choice: AcSuggestion | null): void {
    this.pickedCard.set(choice);
    if ((choice?.value ?? '') !== this.filters().card) this.patchFilters({ card: choice?.value ?? '' });
  }

  setCardQuery(q: string): void {
    this.cardQuery.set(q);
  }

  suggestCards(q: string) {
    return q.trim().length >= 2 ? this.uniques.suggestCards(q, contentLocale()).pipe(map((list) => list.map(cardOption))) : of([]);
  }

  /** The hero filter is dropped when the other set has no deck with that hero. */
  setContestSet(set: ContestSet | undefined): void {
    this.contestSet.set(set ?? 'winners');
    const hero = this.filters().hero;
    if (hero && !this.contestInSet().some((d) => d.hero?.name === hero)) this.patchFilters({ hero: '' });
  }

  toggleFaction(code: string, on: boolean): void {
    // On the contest tab the hero list follows the factions, so the hero is cleared (as on the site). Elsewhere the
    // hero stays while the list still offers it.
    this.filters.update((f) => {
      const factions = on ? [...f.factions, code] : f.factions.filter((c) => c !== code);
      const keep = this.tab() !== 'contest' && (!f.hero || this.heroOptionsFor(factions).some((o) => o.value === f.hero));
      return { ...f, hero: keep ? f.hero : '', factions };
    });
  }

  /**
   * Hero filter options, grouped by faction (as on the site's decks page). Community tab: the heroes of the public decks,
   * by reference (the API filters on it). Contest tab: the heroes of the set. Mine: the heroes of the account's decks.
   */
  heroOptionsFor(factions: string[]): { value: string; label: string; group?: string }[] {
    const all = $localize`:@@decks.page.allHeroes:Tous les héros`;
    if (this.tab() === 'community') return heroOptions(this.publicHeroes(), factions, all);
    const decks = this.tab() === 'contest' ? this.contestInSet() : this.mine();
    const byName = new Map<string, HeroChoice>();
    for (const d of decks) if (d.hero?.name && !byName.has(d.hero.name)) byName.set(d.hero.name, { value: d.hero.name, label: d.hero.name, faction: d.hero.faction });
    const choices = [...byName.values()].sort((a, b) => a.label.localeCompare(b.label, uiLocale()));
    return heroOptions(choices, factions, all);
  }

  /** « Enregistrer sur mon compte »: each guest deck becomes a private deck of the account, then leaves this device. */
  saveLocalDecks(onSingleCreated?: (id: string) => void): void {
    const decks = this.localDecks();
    if (!decks.length || this.localSaving()) return;
    this.localSaving.set(true);
    this.localError.set(null);
    from(decks)
      .pipe(
        concatMap((d) =>
          this.decksApi.create(guestDeckToWrite(d)).pipe(
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
          if (created.length === 1) onSingleCreated?.(created[0].id);
        },
        error: () => {
          this.serverRes.reload();
          this.localError.set($localize`:@@decks.local.error:Impossible d’enregistrer le deck sur votre compte. Réessayez.`);
        },
      });
  }

  /** Deletes all local guest decks from this device (called after user confirmation). */
  discardLocalDecks(): void {
    for (const d of this.localDecks()) {
      // As « Enregistrer sur mon compte »: the site builder's copy goes too, or it comes back with its next edit.
      this.guests.forgetSiteDeck(d.id);
      this.guests.delete(d.id);
    }
  }

  /** Optimistic toggle, then the count the API returns; calls `onUnauthorized` when login is required. */
  toggleLike(deck: DeckListItem, onUnauthorized?: () => void): void {
    if (!this.auth.isLoggedIn()) {
      onUnauthorized?.();
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
          if (err.status === 401) onUnauthorized?.();
        },
      });
  }

  private setLike(id: string, state: LikeState): void {
    this.likes.update((all) => ({ ...all, [id]: state }));
  }
}
