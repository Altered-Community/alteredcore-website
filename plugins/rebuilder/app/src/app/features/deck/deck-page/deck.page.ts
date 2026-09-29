import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { DeckStore } from '../../../core/deck-store';
import { decklistText, groupByCost } from '../../../core/deck-view';
import { formatInfo } from '../../../core/formats';
import { GuestDeckService } from '../../../core/guest-deck.service';
import { AcButton, AcIconButton } from '../../../ui/buttons';
import { AcBadge, AcRaritySummary } from '../../../ui/chips';
import { AcCollapsible } from '../../../ui/containers';
import { AcSegmented } from '../../../ui/fields';
import { AcIcon } from '../../../ui/icon';
import { AcBreakpointService } from '../../../ui/layout.services';
import { AcCardArt, AcDeckStats } from '../../../ui/metier';
import { AcAppBar, AcBackButton, AcBottomNav, AcTabs, type AcBottomNavItem } from '../../../ui/nav';
import { AcOverlayService } from '../../../ui/overlay';
import { DeckListView } from '../../editor/deck-list-view/deck-list-view';
import { DeckPreview } from '../../editor/deck-preview/deck-preview';
import { DecklistTable } from '../decklist-table/decklist-table';
import { DeckActionsSheet } from '../deck-actions-sheet/deck-actions-sheet';

type DeckTab = 'cartes' | 'decklist';

/** Consultation: Cartes / Decklist tabs, read-only, summary aside with actions. */
@Component({
  selector: 'app-deck-page',
  imports: [
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
  ],
  templateUrl: './deck.page.html',
  styleUrl: './deck.page.scss',
})
export class DeckPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly overlay = inject(AcOverlayService);
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
    { id: 'cartes', label: 'Cartes' },
    { id: 'decklist', label: 'Decklist' },
  ];
  protected readonly groupingOptions = [
    { value: 'type' as const, label: 'Par type' },
    { value: 'cost' as const, label: 'Par coût' },
  ];
  protected readonly info = computed(() => formatInfo(this.deck.format()));
  protected readonly legal = computed(() => this.deck.status().legal && !!this.deck.hero());
  protected readonly groups = computed(() => (this.grouping() === 'type' ? this.deck.groups() : groupByCost(this.deck.lines())));
  protected readonly created = computed(() => {
    const d = this.deck.createdAt();
    return d ? new Date(d).toLocaleDateString('fr-FR') : '';
  });
  protected readonly navItems = computed<AcBottomNavItem[]>(() => [
    { route: `/decks/${this.id()}`, icon: 'eye', label: 'Aperçu' },
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
      this.flash('Liste copiée dans le presse-papiers.');
    } catch {
      this.flash('Copie impossible dans ce navigateur.');
    }
  }

  protected async share(): Promise<void> {
    const url = GuestDeckService.isGuestId(this.id()) ? '' : `${location.origin}/decks/${this.id()}`;
    if (!url) {
      this.flash('Deck invité : enregistré sur cet appareil uniquement. Copiez la liste pour le partager.');
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
      this.flash('Lien copié.');
    } catch {
      this.flash(url);
    }
  }

  protected duplicate(): void {
    const id = this.deck.duplicate();
    this.flash('Deck dupliqué.');
    void this.router.navigate(['/decks', id]);
  }

  protected remove(): void {
    if (!confirm(`Supprimer « ${this.deck.name()} » ?`)) return;
    this.deck.delete().subscribe((ok) => {
      if (ok) void this.router.navigateByUrl('/decks');
      else this.flash(this.deck.error() ?? 'Suppression impossible.');
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
