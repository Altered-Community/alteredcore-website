import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { LocationStrategy, NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AuthSession } from '../../../core/auth-session';
import { PageTitle } from '../../../core/page-title';
import { factionSrc } from '../../../core/assets';
import { DeckStore } from '../../../core/deck-store';
import { groupByCost } from '../../../core/deck-view';
import { formatInfo } from '../../../core/formats';
import { GuestDeckService } from '../../../core/guest-deck.service';
import { AcButton, AcIconButton } from '../../../ui/buttons';
import { AcBadge, AcRaritySummary } from '../../../ui/chips';
import { AcCollapsible, AcSkeleton } from '../../../ui/containers';
import { AcSegmented } from '../../../ui/fields';
import { AcIcon } from '../../../ui/icon';
import { AcBreakpointService } from '../../../ui/layout.services';
import { AcCardArt, AcDeckStats, factionName } from '../../../ui/metier';
import { AcAppBar, AcBackButton, AcBottomNav, AcTabs, type AcBottomNavItem } from '../../../ui/nav';
import { AcOverlayService } from '../../../ui/overlay';
import { DeckListView } from '../../editor/deck-list-view/deck-list-view';
import { DeckPreview } from '../../editor/deck-preview/deck-preview';
import { DecklistTable } from '../decklist-table/decklist-table';
import { DeckActionsSheet, type DeckActionsData, type DeckActionsResult } from '../deck-actions-sheet/deck-actions-sheet';
import { deckImageBusyMessage } from '../deck-image-actions';
import { confirmDeleteDeck, copyDecklist, deckImageSourceFor } from '../deck-actions';
import { DeckImageExport } from '../deck-image-export/deck-image-export';
import { DeckBar } from '../deck-bar/deck-bar';
import { DeckBoard } from '../deck-board/deck-board';
import { openDuplicateDeck } from '../duplicate-deck/duplicate-deck.overlay';
import { openLegalityDetails } from '../../shared/legality-details/legality-details.overlay';
import { openShareDeck } from '../share-deck/share-deck.overlay';
import { HandCalculators } from '../hand-calculators/hand-calculators';
import { HandStats } from '../hand-stats/hand-stats';
import { TestHand } from '../test-hand/test-hand';
import { deckShareUrl } from './share-url';
import { HandSkeleton } from '../../shared/hand-skeleton/hand-skeleton';

type DeckTab = 'cartes' | 'decklist' | 'description' | 'main';

/** Path of each tab under `/decks/:id` (`cartes` is the deck page itself). */
const TAB_PATHS: Record<DeckTab, string | null> = { cartes: null, decklist: 'deck', description: 'description', main: 'main' };

/**
 * Consultation: Aperçu / Decklist / Description / Main de départ, read-only. From 768 px the deck bar (art, stats,
 * actions) sits above the tabs and « Aperçu » is the deck board; on phones, the summary and the bottom navigation.
 */
@Component({
  selector: 'app-deck-page',
  imports: [
    NgTemplateOutlet,
    AcBackButton,
    RouterLink,
    AcAppBar,
    AcBottomNav,
    AcTabs,
    AcSegmented,
    AcButton,
    AcIconButton,
    AcIcon,
    AcBadge,
    AcRaritySummary,
    AcCollapsible,
    AcDeckStats,
    AcCardArt,
    DeckPreview,
    DeckListView,
    DecklistTable,
    DeckImageExport,
    DeckBar,
    DeckBoard,
    TestHand,
    HandStats,
    HandCalculators,
    HandSkeleton,
    AcSkeleton,
  ],
  templateUrl: './deck.page.html',
  styleUrl: './deck.page.scss',
})
export class DeckPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly overlay = inject(AcOverlayService);
  private readonly locationStrategy = inject(LocationStrategy);
  private readonly guestDecks = inject(GuestDeckService);
  protected readonly auth = inject(AuthSession);
  protected readonly deck = inject(DeckStore);
  protected readonly bp = inject(AcBreakpointService);

  protected readonly id = toSignal(this.route.paramMap.pipe(map((p) => p.get('id') ?? '')), { initialValue: '' });
  protected readonly tab = toSignal(this.route.data.pipe(map((d) => (d['tab'] as DeckTab) ?? 'cartes')), {
    initialValue: 'cartes' as DeckTab,
  });
  protected readonly grouping = signal<'type' | 'cost'>('type');
  protected readonly statsOpen = signal(true);
  protected readonly toast = signal<string | null>(null);
  private toastTimer?: ReturnType<typeof setTimeout>;

  protected readonly tabs = [
    { id: 'cartes', label: $localize`:@@deck.page.tabPreview:Aperçu` },
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
      ? $localize`:@@deck.page.moreOwned:Plus d’actions (copier en image, copier la liste, dupliquer, supprimer)`
      : $localize`:@@deck.page.more:Plus d’actions (copier en image, copier la liste, dupliquer)`,
  );
  protected readonly info = computed(() => formatInfo(this.deck.format()));
  protected readonly legality = this.deck.legality;
  protected readonly legal = computed(() => this.legality().state === 'legal');
  protected readonly groups = computed(() => (this.grouping() === 'type' ? this.deck.groups() : groupByCost(this.deck.lines())));
  protected readonly loadingLabel = $localize`:@@deck.page.loading:Chargement du deck…`;
  protected readonly navItems = computed<AcBottomNavItem[]>(() => [
    { route: `/decks/${this.id()}`, icon: 'eye', label: $localize`:@@deck.page.navPreview:Aperçu` },
    { route: `/decks/${this.id()}/deck`, icon: 'layers', label: 'Deck', badge: this.deck.opening() ? undefined : this.deck.total(), badgeTone: this.legal() ? 'success' : 'dark' },
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

  /** The deck's image (« Copier en image »). */
  protected readonly imageSource = computed(() => deckImageSourceFor(this.id(), this.guestDecks));

  protected readonly factionLogo = computed(() => factionSrc(this.deck.hero()?.faction));
  protected readonly factionLabel = computed(() => factionName(this.deck.hero()?.faction));

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
    this.flash(await copyDecklist(this.deck));
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
      // The copy is the user's: it opens in the editor, on « Aperçu ».
      void this.router.navigate(['/decks', id, 'edit', 'apercu']);
    });
  }

  protected remove(): void {
    confirmDeleteDeck(this.overlay, this.deck).subscribe((result) => {
      if (result === true) void this.router.navigateByUrl('/decks');
      else if (result) this.flash(result);
    });
  }

  protected more(): void {
    const data: DeckActionsData = { canDelete: this.deck.owned() === true, image: this.imageSource(), name: this.deck.name() };
    this.overlay
      .open<DeckActionsSheet, DeckActionsResult>(DeckActionsSheet, { title: 'Actions', width: 400, data })
      .afterClosed.subscribe((a) => {
        if (a === 'copy') void this.copyList();
        if (a === 'duplicate') this.duplicate();
        if (a === 'delete') this.remove();
        if (typeof a === 'object') void this.imageDone(a.image);
      });
  }

  /** An image action of the sheet: « Génération… » until the image is there. */
  private async imageDone(image: Promise<string | null>): Promise<void> {
    clearTimeout(this.toastTimer);
    this.toast.set(deckImageBusyMessage());
    const message = await image;
    if (message) this.flash(message);
    else this.toast.set(null);
  }

  protected flash(message: string): void {
    this.toast.set(message);
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 3200);
  }
}
