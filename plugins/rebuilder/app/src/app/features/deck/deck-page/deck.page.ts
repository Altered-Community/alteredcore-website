import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { LocationStrategy, NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AuthSession } from '../../../core/auth-session';
import { PageTitle } from '../../../core/page-title';
import { factionSrc } from '../../../core/assets';
import { DeckStore } from '../../../core/deck-store';
import { decklistText, groupByCost } from '../../../core/deck-view';
import { formatInfo } from '../../../core/formats';
import { GuestDeckService } from '../../../core/guest-deck.service';
import { uiLocale } from '../../../core/i18n';
import { ArButton, ArIconButton } from '../../../ui/buttons';
import { ArBadge, ArRaritySummary } from '../../../ui/chips';
import { ArCollapsible } from '../../../ui/containers';
import { ArSegmented } from '../../../ui/fields';
import { ArIcon } from '../../../ui/icon';
import { ArBreakpointService } from '../../../ui/layout.services';
import { ArCardArt, ArDeckStats, factionName } from '../../../ui/metier';
import { ArAppBar, ArBackButton, ArBottomNav, ArTabs, type ArBottomNavItem } from '../../../ui/nav';
import { ArOverlayService } from '../../../ui/overlay';
import { DeckListView } from '../../editor/deck-list-view/deck-list-view';
import { DeckPreview } from '../../editor/deck-preview/deck-preview';
import { DecklistTable } from '../decklist-table/decklist-table';
import { DeckActionsSheet } from '../deck-actions-sheet/deck-actions-sheet';
import { openDuplicateDeck } from '../duplicate-deck/duplicate-deck.overlay';
import { openLegalityDetails } from '../../shared/legality-details/legality-details.overlay';
import { openCardZoom } from '../../shared/card-zoom/card-zoom.overlay';
import { openShareDeck } from '../share-deck/share-deck.overlay';
import { HandCalculators } from '../hand-calculators/hand-calculators';
import { HandStats } from '../hand-stats/hand-stats';
import { TestHand } from '../test-hand/test-hand';
import { deckShareUrl } from './share-url';

type DeckTab = 'cartes' | 'decklist' | 'description' | 'main';

/** Path of each tab under `/decks/:id` (`cartes` is the deck page itself). */
const TAB_PATHS: Record<DeckTab, string | null> = { cartes: null, decklist: 'deck', description: 'description', main: 'main' };

/** Consultation: Cartes / Decklist / Description / Main de départ tabs, read-only, summary aside with actions. */
@Component({
  selector: 'app-deck-page',
  imports: [
    NgTemplateOutlet,
    ArBackButton,
    RouterLink,
    ArAppBar,
    ArBottomNav,
    ArTabs,
    ArSegmented,
    ArButton,
    ArIconButton,
    ArIcon,
    ArBadge,
    ArRaritySummary,
    ArCollapsible,
    ArDeckStats,
    ArCardArt,
    DeckPreview,
    DeckListView,
    DecklistTable,
    TestHand,
    HandStats,
    HandCalculators,
  ],
  templateUrl: './deck.page.html',
  styleUrl: './deck.page.scss',
})
export class DeckPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly overlay = inject(ArOverlayService);
  private readonly locationStrategy = inject(LocationStrategy);
  protected readonly auth = inject(AuthSession);
  protected readonly deck = inject(DeckStore);
  protected readonly bp = inject(ArBreakpointService);

  protected readonly id = toSignal(this.route.paramMap.pipe(map((p) => p.get('id') ?? '')), { initialValue: '' });
  protected readonly tab = toSignal(this.route.data.pipe(map((d) => (d['tab'] as DeckTab) ?? 'cartes')), {
    initialValue: 'cartes' as DeckTab,
  });
  protected readonly grouping = signal<'type' | 'cost'>('type');
  protected readonly statsOpen = signal(true);
  protected readonly toast = signal<string | null>(null);
  private toastTimer?: ReturnType<typeof setTimeout>;

  protected readonly tabs = [
    { id: 'cartes', label: $localize`:@@deck.page.tabCards:Cartes` },
    { id: 'decklist', label: 'Decklist' },
    { id: 'description', label: $localize`:@@deck.page.tabDescription:Description` },
    { id: 'main', label: $localize`:@@deck.page.tabHand:Main de départ` },
  ];
  protected readonly groupingOptions = [
    { value: 'type' as const, label: $localize`:@@deck.page.byType:Par type` },
    { value: 'cost' as const, label: $localize`:@@deck.page.byCost:Par coût` },
  ];
  protected readonly visibilityLabels = {
    public: $localize`:@@deck.page.public:Public`,
    private: $localize`:@@deck.page.private:Privé`,
  };
  protected readonly moreLabel = computed(() =>
    this.deck.owned()
      ? $localize`:@@deck.page.moreOwned:Plus d’actions (copier la liste, dupliquer, supprimer)`
      : $localize`:@@deck.page.more:Plus d’actions (copier la liste, dupliquer)`,
  );
  protected readonly info = computed(() => formatInfo(this.deck.format()));
  protected readonly legality = this.deck.legality;
  protected readonly legal = computed(() => this.legality().state === 'legal');
  protected readonly groups = computed(() => (this.grouping() === 'type' ? this.deck.groups() : groupByCost(this.deck.lines())));
  protected readonly created = computed(() => {
    const d = this.deck.createdAt();
    return d ? new Date(d).toLocaleDateString(uiLocale()) : '';
  });
  protected readonly navItems = computed<ArBottomNavItem[]>(() => [
    { route: `/decks/${this.id()}`, icon: 'eye', label: $localize`:@@deck.page.navPreview:Aperçu` },
    { route: `/decks/${this.id()}/deck`, icon: 'layers', label: 'Deck', badge: this.deck.total(), badgeTone: this.legal() ? 'success' : 'dark' },
    { route: `/decks/${this.id()}/description`, icon: 'text', label: $localize`:@@deck.page.navDescription:Infos` },
    { route: `/decks/${this.id()}/main`, icon: 'hand', label: $localize`:@@deck.page.navHand:Main` },
  ]);

  constructor() {
    effect(() => {
      const id = this.id();
      if (id) untracked(() => this.deck.load(id));
    });
    // The deck's name as the page title (as on the site's deck page), over the route's « Deck ». After the route's own
    // title, which the router sets at the end of the navigation (tab change).
    const pageTitle = inject(PageTitle);
    effect((onCleanup) => {
      const name = this.deck.deckId() === this.id() && !this.deck.loading() ? this.deck.name() : '';
      this.tab();
      if (!name) return;
      const timer = setTimeout(() => pageTitle.set(name));
      onCleanup(() => clearTimeout(timer));
    });
  }

  protected readonly factionLogo = computed(() => factionSrc(this.deck.hero()?.faction));
  protected readonly factionLabel = computed(() => factionName(this.deck.hero()?.faction));
  protected readonly heroZoomLabel = computed(() => $localize`:@@ui.cardTile.zoom:Agrandir ${this.deck.hero()?.name ?? ''}:name:`);

  /** The hero banner: the hero card large, as on the site's deck page. */
  protected zoomHero(): void {
    const hero = this.deck.hero();
    if (hero) openCardZoom(this.overlay, { card: { reference: hero.reference, name: hero.name, faction: { code: hero.faction, name: hero.faction }, cardType: { reference: 'HERO' } } });
  }

  protected setTab(id: string): void {
    const path = TAB_PATHS[id as DeckTab] ?? null;
    void this.router.navigate(path ? ['/decks', this.id(), path] : ['/decks', this.id()], { replaceUrl: true });
  }

  /** Illegal badge: failed rules and format errors. */
  protected showLegality(): void {
    openLegalityDetails(this.overlay, { format: this.info().label, legality: this.legality() });
  }

  /** Only shown for the user's own decks; someone else's deck can be duplicated instead. */
  protected edit(): void {
    if (this.deck.editable()) void this.router.navigate(['/decks', this.id(), 'edit']);
  }

  protected async copyList(): Promise<void> {
    const text = decklistText(this.deck.lines(), this.deck.hero());
    try {
      await navigator.clipboard.writeText(text);
      this.flash($localize`:@@deck.page.listCopied:Liste copiée dans le presse-papiers.`);
    } catch {
      this.flash($localize`:@@deck.page.copyFailed:Copie impossible dans ce navigateur.`);
    }
  }

  /**
   * The share window (link, « Copier », QR code), as on the site's deck page; never the system share sheet. The user's
   * own private deck shows « Ce deck est privé » first (« Rendre public & partager »).
   */
  protected share(): void {
    const url = GuestDeckService.isGuestId(this.id()) ? '' : deckShareUrl(this.router, this.locationStrategy, this.id());
    if (!url) {
      this.flash($localize`:@@deck.page.guestShare:Deck invité : enregistré sur cet appareil uniquement. Copiez la liste pour le partager.`);
      return;
    }
    // The decks API serves a private deck to its owner only: a private deck shown here is the user's.
    const privateOwned = !this.deck.isPublic();
    openShareDeck(this.overlay, { url, privateOwned });
  }

  protected duplicate(): void {
    openDuplicateDeck(this.overlay).afterClosed.subscribe((id) => {
      if (!id) return;
      this.flash($localize`:@@deck.page.duplicated:Deck dupliqué.`);
      void this.router.navigate(['/decks', id]);
    });
  }

  protected remove(): void {
    if (!confirm($localize`:@@deck.page.deleteConfirm:Supprimer « ${this.deck.name()}:name: » ?`)) return;
    this.deck.delete().subscribe((ok) => {
      if (ok) void this.router.navigateByUrl('/decks');
      else this.flash(this.deck.actionError() ?? $localize`:@@deck.page.deleteFailed:Suppression impossible.`);
    });
  }

  protected more(): void {
    this.overlay
      .open<DeckActionsSheet, 'copy' | 'duplicate' | 'delete'>(DeckActionsSheet, { title: 'Actions', width: 400, data: { canDelete: this.deck.owned() === true } })
      .afterClosed.subscribe((a) => {
        if (a === 'copy') void this.copyList();
        if (a === 'duplicate') this.duplicate();
        if (a === 'delete') this.remove();
      });
  }

  private flash(message: string): void {
    this.toast.set(message);
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 3200);
  }
}
