import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
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
import { ArCardArt, ArDeckStats } from '../../../ui/metier';
import { ArAppBar, ArBackButton, ArBottomNav, ArTabs, type ArBottomNavItem } from '../../../ui/nav';
import { ArOverlayService } from '../../../ui/overlay';
import { DeckListView } from '../../editor/deck-list-view/deck-list-view';
import { DeckPreview } from '../../editor/deck-preview/deck-preview';
import { DecklistTable } from '../decklist-table/decklist-table';
import { DeckActionsSheet } from '../deck-actions-sheet/deck-actions-sheet';

type DeckTab = 'cartes' | 'decklist';

/** Consultation: Cartes / Decklist tabs, read-only, summary aside with actions. */
@Component({
  selector: 'app-deck-page',
  imports: [
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
  ],
  templateUrl: './deck.page.html',
  styleUrl: './deck.page.scss',
})
export class DeckPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly overlay = inject(ArOverlayService);
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
  protected readonly legal = computed(() => this.deck.status().legal && !!this.deck.hero());
  protected readonly groups = computed(() => (this.grouping() === 'type' ? this.deck.groups() : groupByCost(this.deck.lines())));
  protected readonly created = computed(() => {
    const d = this.deck.createdAt();
    return d ? new Date(d).toLocaleDateString(uiLocale()) : '';
  });
  protected readonly navItems = computed<ArBottomNavItem[]>(() => [
    { route: `/decks/${this.id()}`, icon: 'eye', label: $localize`:@@deck.page.navPreview:Aperçu` },
    { route: `/decks/${this.id()}/deck`, icon: 'layers', label: 'Deck', badge: this.deck.total(), badgeTone: this.legal() ? 'success' : 'dark' },
  ]);

  constructor() {
    effect(() => {
      const id = this.id();
      if (id) untracked(() => this.deck.load(id));
    });
  }

  protected setTab(id: string): void {
    void this.router.navigate(id === 'decklist' ? ['/decks', this.id(), 'deck'] : ['/decks', this.id()], { replaceUrl: true });
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

  protected async share(): Promise<void> {
    const url = GuestDeckService.isGuestId(this.id()) ? '' : `${location.origin}/decks/${this.id()}`;
    if (!url) {
      this.flash($localize`:@@deck.page.guestShare:Deck invité : enregistré sur cet appareil uniquement. Copiez la liste pour le partager.`);
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({ title: this.deck.name(), url });
        return;
      } catch {
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      this.flash($localize`:@@deck.page.linkCopied:Lien copié.`);
    } catch {
      this.flash(url);
    }
  }

  protected duplicate(): void {
    const id = this.deck.duplicate();
    this.flash($localize`:@@deck.page.duplicated:Deck dupliqué.`);
    void this.router.navigate(['/decks', id]);
  }

  protected remove(): void {
    if (!confirm($localize`:@@deck.page.deleteConfirm:Supprimer « ${this.deck.name()}:name: » ?`)) return;
    this.deck.delete().subscribe((ok) => {
      if (ok) void this.router.navigateByUrl('/decks');
      else this.flash(this.deck.error() ?? $localize`:@@deck.page.deleteFailed:Suppression impossible.`);
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
