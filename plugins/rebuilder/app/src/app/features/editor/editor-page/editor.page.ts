import { Component, DestroyRef, ElementRef, Injector, afterNextRender, computed, effect, inject, signal, untracked } from '@angular/core';
import { LocationStrategy } from '@angular/common';
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AuthSession } from '../../../core/auth-session';
import { DeckStore } from '../../../core/deck-store';
import { GuestDeckService } from '../../../core/guest-deck.service';
import { formatInfo } from '../../../core/formats';
import { rarityLimits } from '../../../core/deck-rules';
import { AcButton, AcIconButton, MENU_POSITIONS } from '../../../ui/buttons';
import { AcSegmented } from '../../../ui/fields';
import { AcIcon } from '../../../ui/icon';
import { AcDrawerHandle, AcDrawerState, AcDrawerTab, AcSkeleton, AcToast } from '../../../ui/containers';
import { storedFlag } from '../../../core/stored-flag';
import { contentLocale } from '../../../core/locale';
import { localizedText, type Card } from '../../../core/models';
import { AcCardArt, AcRarityLimits, AcSaveStatus, rarityLimitItems } from '../../../ui/metier';
import { AcBreakpointService } from '../../../ui/layout.services';
import { AcAppBar, AcBackButton, AcBottomNav, type AcBottomNavItem } from '../../../ui/nav';
import { AcOverlayService } from '../../../ui/overlay';
import { openDeckSettings } from '../../shared/deck-settings/deck-settings.overlay';
import { openHeroPicker } from '../../shared/hero-picker/hero-picker.overlay';
import { openDeckOverview } from '../deck-overview/deck-overview.overlay';
import { EditorAltArts, confirmAltArtDefaults } from '../editor-alt-arts';
import { CardSearchStore } from '../../search/card-search.store';
import { CardSearch } from '../../search/card-search/card-search';
import { DeckListView } from '../deck-list-view/deck-list-view';
import { DeckPanel } from '../deck-panel/deck-panel';
import { DeckPreview } from '../deck-preview/deck-preview';
import { HandSkeleton } from '../../shared/hand-skeleton/hand-skeleton';
import { TestHand } from '../../deck/test-hand/test-hand';
import { HandStats } from '../../deck/hand-stats/hand-stats';
import { HandCalculators } from '../../deck/hand-calculators/hand-calculators';
import { editorLegality, openEditorLegality } from '../editor-legality';
import { DeckBar } from '../../deck/deck-bar/deck-bar';
import { DeckBoard } from '../../deck/deck-board/deck-board';
import { DeckImageExport } from '../../deck/deck-image-export/deck-image-export';
import { deckImageBusyMessage, runDeckImageAction, type DeckImageAction } from '../../deck/deck-image-actions';
import { confirmDeleteDeck, copyDecklist, deckImageSourceFor } from '../../deck/deck-actions';
import { openDuplicateDeck } from '../../deck/duplicate-deck/duplicate-deck.overlay';
import { openTokenArts } from '../token-arts/token-arts.overlay';
import { openShareDeck } from '../../deck/share-deck/share-deck.overlay';
import { deckShareUrl } from '../../deck/deck-page/share-url';
import { openSignInToShare } from '../sign-in-to-share/sign-in-to-share.overlay';
import { rememberShareAfterSignIn, takeShareAfterSignIn } from '../share-after-sign-in';

export type EditorView = 'search' | 'apercu' | 'deck' | 'main';
/** « Partager » saves the deck first, so the link shows the latest changes. */
export type EditorAction = 'share';

@Component({
  selector: 'app-editor-page',
  providers: [CardSearchStore, EditorAltArts],
  imports: [
    AcToast,
    AcDrawerHandle,
    AcDrawerTab,
    RouterLink,
    AcAppBar,
    AcBackButton,
    AcBottomNav,
    CdkMenu,
    CdkMenuItem,
    CdkMenuTrigger,
    DeckBar,
    DeckBoard,
    DeckImageExport,
    AcSegmented,
    AcButton,
    AcIconButton,
    AcIcon,
    AcSaveStatus,
    AcCardArt,
    AcRarityLimits,
    CardSearch,
    DeckPanel,
    DeckPreview,
    TestHand,
    HandStats,
    HandCalculators,
    DeckListView,
    HandSkeleton,
    AcSkeleton,
  ],
  host: {
    '(window:beforeunload)': 'beforeUnload($event)',
    '(window:pagehide)': 'pageHidden()',
    '(document:visibilitychange)': 'visibilityChange()',
  },
  templateUrl: './editor.page.html',
  styleUrl: './editor.page.scss',
})
export class EditorPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly overlay = inject(AcOverlayService);
  private readonly locationStrategy = inject(LocationStrategy);
  private readonly auth = inject(AuthSession);
  private readonly guestDecks = inject(GuestDeckService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly bp = inject(AcBreakpointService);
  protected readonly deck = inject(DeckStore);
  protected readonly altArts = inject(EditorAltArts);
  private readonly injector = inject(Injector);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected readonly id = toSignal(this.route.paramMap.pipe(map((p) => p.get('id') ?? '')), { initialValue: '' });
  protected readonly view = toSignal(this.route.data.pipe(map((d) => (d['view'] as EditorView) ?? 'search')), {
    initialValue: 'search' as EditorView,
  });
  protected readonly labels = {
    myDeck: $localize`:@@title.myDeck:Mon deck`,
    public: $localize`:@@editor.public:Public`,
    private: $localize`:@@editor.private:Privé`,
    share: $localize`:@@editor.share:Partager`,
    saving: $localize`:@@editor.savingFirst:Enregistrement…`,
    saved: $localize`:@@editor.share.saved:Deck enregistré : le lien affiche la dernière version.`,
    savedToAccount: $localize`:@@editor.share.savedToAccount:Deck enregistré sur votre compte : vous pouvez le partager.`,
    more: $localize`:@@editor.moreActions:Plus d’actions`,
    imageBusy: deckImageBusyMessage(),
    loading: $localize`:@@deck.page.loading:Chargement du deck…`,
  };
  /** The « ⋯ » menu: placed as the split buttons' menus. */
  protected readonly menuPositions = MENU_POSITIONS;
  protected readonly modeOptions = [
    { value: 'search' as const, label: $localize`:@@editor.search:Recherche`, icon: 'search' as const },
    { value: 'apercu' as const, label: $localize`:@@editor.preview:Aperçu`, icon: 'eye' as const },
    { value: 'main' as const, label: $localize`:@@editor.hand:Main de départ`, icon: 'hand' as const },
  ];
  protected readonly formatLabel = computed(() => formatInfo(this.deck.format()).label);
  /** From 768 px: the deck panel can be hidden (a tab on the page edge brings it back), remembered in this browser. */
  protected readonly deckOpen = storedFlag('rebuilder.editor.deckOpen', true);
  protected readonly legality = computed(() => editorLegality(this.deck));
  protected readonly legal = computed(() => this.legality().state === 'legal');
  /** Mini curve of the reduced bar: the cost of the last card added. */
  protected readonly highlight = computed(() => {
    const change = this.deck.lastChange();
    return change && change.delta > 0 ? Math.min(6, Math.max(0, (change.card.mainCost ?? 1) - 1)) : null;
  });
  /** The deck's image (« Copier en image »), once the deck is loaded. */
  protected readonly imageSource = computed(() => {
    const id = this.deck.deckId();
    return id && !this.deck.loading() ? deckImageSourceFor(id, this.guestDecks) : null;
  });
  protected readonly imageBusy = signal(false);
  protected readonly deckTabLabel = computed(() =>
    this.legal()
      ? $localize`:@@editor.showDeckLegal:Afficher le deck : ${this.deck.total()}:count: cartes, valide`
      : $localize`:@@editor.showDeckIssues:Afficher le deck : ${this.deck.total()}:count: cartes, à corriger`,
  );
  /** Hides or shows the deck panel, with its motion; the focus moves to the control that undoes it. */
  private readonly drawerFocus = (open: boolean) =>
    afterNextRender(() => this.el.querySelector<HTMLElement>(open ? '.panel > .ac-drawer-handle' : '.deck-tab')?.focus(), {
      injector: this.injector,
    });
  private readonly searchDrawer = new AcDrawerState(this.deckOpen, 'end', this.drawerFocus);
  /** « Aperçu » shows the whole deck already: the panel starts hidden there, behind its tab. */
  private readonly apercuDrawer = new AcDrawerState(signal(false), 'end', this.drawerFocus);
  protected readonly deckDrawer = computed(() => (this.effectiveView() === 'apercu' ? this.apercuDrawer : this.searchDrawer));
  protected readonly subtitle = computed(() => `${this.formatLabel()} · ${this.deck.isPublic() ? this.labels.public : this.labels.private}`);
  /**
   * Phones, search and « Aperçu » views of an editable deck: the app bar takes the hero (« Choisir un héros ») and, as its title, the deck
   * name over the rarities against the format's caps (« Résumé du deck »), what the deck bar shows from 768 px.
   */
  protected readonly deckAppBar = computed(() => this.bp.compact() && (this.view() === 'search' || this.view() === 'apercu') && this.deck.editable() && !this.deck.opening() && !this.deck.loadError());
  protected readonly rarityLimits = computed(() => rarityLimits(this.deck.status(), this.deck.format()));
  protected readonly heroButtonLabel = computed(() => {
    const name = this.deck.hero()?.name;
    return name ? $localize`:@@editor.changeHeroOf:Changer de héros (${name}:name:)` : $localize`:@@ui.deckSummary.changeHero:Changer de héros`;
  });
  /** The button's name replaces its content: it carries the rarities too, as the badges' labels. */
  /** With the deck title (`deckAppBar`), the app bar's own title and subtitle are left empty. */
  protected readonly appBarTitle = computed(() => {
    if (this.deckAppBar()) return '';
    if (this.deck.opening()) return this.labels.loading;
    return this.view() === 'deck' ? this.labels.myDeck : this.deck.name() || 'Deck';
  });
  protected readonly appBarSubtitle = computed(() => (this.deckAppBar() || this.view() === 'deck' || this.deck.opening() ? '' : this.subtitle()));
  protected readonly overviewLabel = computed(() =>
    [
      $localize`:@@editor.overviewOf:Résumé du deck ${this.deck.name()}:name:`,
      ...rarityLimitItems(this.rarityLimits()).map((r) => r.label),
    ].join(', '),
  );
  protected readonly effectiveView = computed<EditorView>(() => (this.view() === 'deck' && !this.bp.compact() ? 'search' : this.view()));
  protected readonly base = computed(() => `/decks/${this.id()}/edit`);
  protected readonly navItems = computed<AcBottomNavItem[]>(() => [
    { route: this.base(), icon: 'search', label: $localize`:@@editor.search:Recherche` },
    { route: `${this.base()}/apercu`, icon: 'eye', label: $localize`:@@editor.preview:Aperçu` },
    {
      route: `${this.base()}/deck`,
      icon: 'layers',
      label: $localize`:@@editor.deck:Deck`,
      badge: this.deck.opening() ? undefined : this.deck.total(),
      badgeTone: editorLegality(this.deck).state === 'legal' ? 'success' : 'dark',
    },
    { route: `${this.base()}/main`, icon: 'hand', label: $localize`:@@editor.handShort:Main` },
  ]);
  /** The action waiting for the deck to be saved: its button shows the wait, both are disabled. */
  protected readonly waiting = signal<EditorAction | null>(null);
  /** The action a failed save stopped: the error banner says « Réessayer » carries it on. */
  protected readonly stopped = signal<EditorAction | null>(null);
  protected readonly readonlyServerDeck = computed(() => !this.deck.loading() && !this.deck.loadError() && this.deck.owned() === false);

  /** « Nom ×n » after a copy is added or removed, with « Annuler » restoring the previous count (after an add, as the site's deck builder toast, and after a removal). */
  protected readonly toast = signal<{ card: Card; name: string; quantity: number; delta: number } | null>(null);
  protected readonly undoLabel = $localize`:@@editor.toast.undo:Annuler`;
  private toastTimer?: ReturnType<typeof setTimeout>;
  /** A message of the deck bar's actions (copied, image unavailable…), over the card toast. */
  protected readonly notice = signal<string | null>(null);
  private noticeTimer?: ReturnType<typeof setTimeout>;
  /** The change « Annuler » makes is not announced again. */
  private undone: unknown = null;

  protected undo(card: Card, previous: number): void {
    this.deck.setQuantity(card, previous);
    this.undone = this.deck.lastChange();
    this.toast.set(null);
  }

  constructor() {
    // A change made before this page (another deck) is not announced.
    this.deck.lastChange.set(null);
    effect(() => {
      const change = this.deck.lastChange();
      if (!change || change === this.undone) return;
      untracked(() => {
        this.toast.set({ ...change, name: localizedText(change.card.name, contentLocale()) || change.card.reference });
        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => this.toast.set(null), 2600);
      });
    });
    effect(() => {
      const id = this.id();
      if (id) untracked(() => this.deck.load(id));
    });
    this.destroyRef.onDestroy(() => this.deck.flush());
    // Saved meanwhile (the next autosave): nothing is stopped any more.
    effect(() => {
      if (!this.deck.saveError()) untracked(() => this.stopped.set(null));
    });
    // Back from the site's login after « Partager » on a guest deck: the deck goes to the account, then the share window opens.
    effect(() => {
      const id = this.id();
      if (!GuestDeckService.isGuestId(id) || this.deck.deckId() !== id || this.deck.loadError()) return;
      if (!this.auth.isLoggedIn() || this.auth.sessionRestoring()) return;
      untracked(() => {
        if (takeShareAfterSignIn(id)) this.shareGuest();
      });
    });
  }

  /** « Partager »: saves the deck, then opens the share window. */
  protected act(action: EditorAction): void {
    // Before the deck is loaded, the share window would show the store's defaults (a public deck as private).
    if (this.waiting() || this.deck.loading()) return;
    if (action === 'share' && this.deck.isGuest()) {
      this.shareGuest();
      return;
    }
    this.stopped.set(null);
    this.waiting.set(action);
    // Left meanwhile: no navigation or share window on another page.
    this.deck.saveNow().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((ok) => {
      this.waiting.set(null);
      if (!ok) {
        this.stopped.set(action);
        return;
      }
      this.openShare(this.labels.saved);
    });
  }

  /** « Réessayer » of the error banner: the save again, then the action it stopped. */
  protected retry(): void {
    const action = this.stopped();
    if (action) this.act(action);
    else this.deck.retrySave();
  }

  /**
   * A guest deck has no link: signed out, « Connectez-vous pour partager » (then the site's login, back here); signed in,
   * the deck moves to the account (and leaves this device), then the share window opens on the account deck.
   */
  private shareGuest(): void {
    const id = this.deck.deckId();
    if (!id) return;
    if (!this.auth.isLoggedIn()) {
      openSignInToShare(this.overlay).afterClosed.subscribe((signIn) => {
        if (!signIn) return;
        rememberShareAfterSignIn(id);
        void this.router.navigateByUrl('/login');
      });
      return;
    }
    this.stopped.set(null);
    this.waiting.set('share');
    this.deck.moveToAccount().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((created) => {
      this.waiting.set(null);
      if (!created) {
        this.stopped.set('share');
        return;
      }
      // Same view of the editor, on the account deck.
      void this.router.navigateByUrl(this.router.url.replace(id, created), { replaceUrl: true }).then(() => this.openShare(this.labels.savedToAccount));
    });
  }

  private openShare(saved: string): void {
    const id = this.deck.deckId();
    if (!id) return;
    // The decks API serves a private deck to its owner only: « Rendre public & partager » comes first.
    openShareDeck(this.overlay, { url: deckShareUrl(this.router, this.locationStrategy, id), privateOwned: !this.deck.isPublic(), saved });
  }

  protected setMode(mode: string | undefined): void {
    void this.router.navigateByUrl(mode === 'apercu' || mode === 'main' ? `${this.base()}/${mode}` : this.base());
  }

  protected flash(message: string): void {
    this.notice.set(message);
    clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => this.notice.set(null), 3200);
  }

  protected showLegality(): void {
    openEditorLegality(this.overlay, this.deck);
  }

  protected chooseTokenArts(): void {
    openTokenArts(this.overlay);
  }

  protected applyAltArtDefaults(): void {
    confirmAltArtDefaults(this.overlay, this.altArts).subscribe((message) => {
      if (message) this.flash(message);
    });
  }

  /** The deck's image: copied, saved or opened (reduced bar: the button and its « ⋯ » menu). */
  protected async image(action: DeckImageAction): Promise<void> {
    const source = this.imageSource();
    if (!source || this.imageBusy()) return;
    this.imageBusy.set(true);
    const message = await runDeckImageAction(action, source, this.deck.name());
    this.imageBusy.set(false);
    if (message) this.flash(message);
  }

  protected async copyList(): Promise<void> {
    this.flash(await copyDecklist(this.deck));
  }

  /** The copy is the user's: it opens in the editor. */
  protected duplicate(): void {
    openDuplicateDeck(this.overlay).afterClosed.subscribe((id) => {
      if (!id) return;
      this.flash($localize`:@@deck.page.duplicated:Deck dupliqué.`);
      void this.router.navigate(['/decks', id, 'edit', 'apercu']);
    });
  }

  protected remove(): void {
    confirmDeleteDeck(this.overlay, this.deck).subscribe((result) => {
      if (result === true) void this.router.navigateByUrl('/decks');
      else if (result) this.flash(result);
    });
  }

  protected openSettings(): void {
    openDeckSettings(this.overlay, {
      name: this.deck.name(),
      description: this.deck.description(),
      hero: this.deck.hero(),
      format: this.deck.format(),
      isPublic: this.deck.isPublic(),
    }).afterClosed.subscribe((s) => {
      if (!s) return;
      this.deck.updateSettings({ name: s.name, description: s.description, hero: s.hero ?? undefined, format: s.format, isPublic: s.isPublic });
    });
  }

  /** The hero portrait's shortcut: « Choisir un héros » alone, the other settings stay behind the settings button. */
  protected changeHero(): void {
    openHeroPicker(this.overlay, this.deck.hero()).afterClosed.subscribe((hero) => {
      if (hero) this.deck.updateSettings({ hero });
    });
  }

  /** « Résumé du deck » (phones, from the app bar's title): it closes on the hero picker, the legality or the « Deck » view. */
  protected openOverview(): void {
    openDeckOverview(this.overlay).afterClosed.subscribe((action) => {
      if (action === 'hero') this.changeHero();
      else if (action === 'legality') this.showLegality();
      else if (action === 'deck') void this.router.navigateByUrl(`${this.base()}/deck`);
    });
  }

  /**
   * Tab closed, reloaded, or a site link followed: pending changes go out as a `keepalive` request
   * (it outlives the page); the browser asks for confirmation only when they may still be lost.
   */
  protected beforeUnload(event: BeforeUnloadEvent): void {
    if (!this.deck.editable() || !this.deck.leavePage()) return;
    event.preventDefault();
    // Older browsers show the dialog only when returnValue is set.
    event.returnValue = '';
  }

  /** Mobile browsers may skip `beforeunload`: `pagehide` and hiding the tab flush too. */
  protected pageHidden(): void {
    this.deck.flush({ keepalive: true });
  }

  protected visibilityChange(): void {
    if (document.visibilityState === 'hidden') this.deck.flush({ keepalive: true });
  }

  protected duplicateToGuest(): void {
    const id = this.deck.duplicateToGuest(this.deck.name());
    void this.router.navigate(['/decks', id, 'edit', 'apercu']);
  }
}
