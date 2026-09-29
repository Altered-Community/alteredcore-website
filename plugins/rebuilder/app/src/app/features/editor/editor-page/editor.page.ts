import { Component, DestroyRef, computed, effect, inject, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { DeckStore } from '../../../core/deck-store';
import { formatInfo } from '../../../core/formats';
import { ArButton } from '../../../ui/buttons';
import { ArEditableTitle, ArSegmented } from '../../../ui/fields';
import { ArIcon } from '../../../ui/icon';
import { ArBreakpointService } from '../../../ui/layout.services';
import { ArAppBar, ArAvatar, ArBackButton, ArBottomNav, ArBreadcrumb, type ArBottomNavItem } from '../../../ui/nav';
import { ArOverlayService } from '../../../ui/overlay';
import { AuthSession } from '../../../core/auth-session';
import { openDeckSettings } from '../../shared/deck-settings/deck-settings.overlay';
import { CardSearchStore } from '../../search/card-search.store';
import { CardSearch } from '../../search/card-search/card-search';
import { DeckListView } from '../deck-list-view/deck-list-view';
import { DeckPanel } from '../deck-panel/deck-panel';
import { DeckPreview } from '../deck-preview/deck-preview';

export type EditorView = 'search' | 'apercu' | 'deck';

@Component({
  selector: 'app-editor-page',
  providers: [CardSearchStore],
  imports: [
    RouterLink,
    ArAppBar,
    ArAvatar,
    ArBackButton,
    ArBottomNav,
    ArBreadcrumb,
    ArEditableTitle,
    ArSegmented,
    ArButton,
    ArIcon,
    CardSearch,
    DeckPanel,
    DeckPreview,
    DeckListView,
  ],
  templateUrl: './editor.page.html',
  styleUrl: './editor.page.scss',
})
export class EditorPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly overlay = inject(ArOverlayService);
  protected readonly bp = inject(ArBreakpointService);
  protected readonly deck = inject(DeckStore);
  protected readonly auth = inject(AuthSession);

  protected readonly id = toSignal(this.route.paramMap.pipe(map((p) => p.get('id') ?? '')), { initialValue: '' });
  protected readonly view = toSignal(this.route.data.pipe(map((d) => (d['view'] as EditorView) ?? 'search')), {
    initialValue: 'search' as EditorView,
  });
  protected readonly labels = {
    myDeck: $localize`:@@title.myDeck:Mon deck`,
    account: $localize`:@@editor.account:Compte`,
    signIn: $localize`:@@editor.signIn:Se connecter`,
    public: $localize`:@@editor.public:Public`,
    private: $localize`:@@editor.private:Privé`,
    breadcrumb: [{ label: $localize`:@@editor.myDecks:Mes decks`, route: '/decks' }, { label: $localize`:@@editor.edit:Modifier` }],
  };
  protected readonly modeOptions = [
    { value: 'search' as const, label: $localize`:@@editor.search:Recherche`, icon: 'search' as const },
    { value: 'apercu' as const, label: $localize`:@@editor.viewDeck:Voir le deck`, icon: 'eye' as const },
  ];
  protected readonly formatLabel = computed(() => formatInfo(this.deck.format()).label);
  protected readonly subtitle = computed(() => `${this.formatLabel()} · ${this.deck.isPublic() ? this.labels.public : this.labels.private}`);
  protected readonly effectiveView = computed<EditorView>(() => (this.view() === 'deck' && !this.bp.compact() ? 'search' : this.view()));
  protected readonly base = computed(() => `/decks/${this.id()}/edit`);
  protected readonly navItems = computed<ArBottomNavItem[]>(() => [
    { route: this.base(), icon: 'search', label: $localize`:@@editor.search:Recherche` },
    { route: `${this.base()}/apercu`, icon: 'eye', label: $localize`:@@editor.preview:Aperçu` },
    {
      route: `${this.base()}/deck`,
      icon: 'layers',
      label: $localize`:@@editor.deck:Deck`,
      badge: this.deck.total(),
      badgeTone: this.deck.status().legal ? 'success' : 'dark',
    },
  ]);
  protected readonly readonlyServerDeck = computed(() => !this.deck.loading() && !this.deck.error() && this.deck.owned() === false);

  constructor() {
    effect(() => {
      const id = this.id();
      if (id) untracked(() => this.deck.load(id));
    });
    inject(DestroyRef).onDestroy(() => this.deck.flush());
  }

  protected setMode(mode: string | undefined): void {
    void this.router.navigateByUrl(mode === 'apercu' ? `${this.base()}/apercu` : this.base());
  }

  protected openSettings(): void {
    openDeckSettings(this.overlay, {
      hero: this.deck.hero(),
      format: this.deck.format(),
      isPublic: this.deck.isPublic(),
    }).afterClosed.subscribe((s) => {
      if (!s) return;
      this.deck.updateSettings({ hero: s.hero ?? undefined, format: s.format, isPublic: s.isPublic });
    });
  }

  protected duplicateToGuest(): void {
    const id = this.deck.duplicateToGuest(this.deck.name());
    void this.router.navigate(['/decks', id, 'edit']);
  }
}
