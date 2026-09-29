import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { newEffectBlock, setsFor } from '../../../core/card-filters';
import type { DeckListItem } from '../../../core/deck-view';
import type { Card } from '../../../core/models';
import { ArButton, ArCardAdd, ArIconButton, ArLikeButton, ArStepper } from '../../../ui/buttons';
import { ArBadge, ArChip, ArCount, ArFilterBar, ArIconToggleGroup, ArLogicDivider, ArRaritySummary, ArTag, ArTerrainTotals } from '../../../ui/chips';
import { ArCardSurface, ArCollapsible, ArFilterSection, ArVirtualGrid } from '../../../ui/containers';
import { ArCombobox, ArEditableTitle, ArInput, ArRadioCard, ArSegmented, ArSelect, type ComboOption } from '../../../ui/fields';
import { ArCardTile, ArCostChart, ArDeckCard, ArDeckRow, ArDeckSummary, ArEffectSummary, ArExtensionTile, ArFactionTabs, ArHeroSelector, ArHeroTile, ArUniqueCard, type ArHeroOption } from '../../../ui/metier';
import { ArAppBar, ArAvatar, ArBackButton, ArBreadcrumb, ArSiteFooter, ArTabs } from '../../../ui/nav';
import { ArOverlayService } from '../../../ui/overlay';
import { DsDemoOverlay } from '../ds-demo-overlay/ds-demo-overlay';

const COLORS = [
  'text', 'text-2', 'text-muted', 'text-disabled', 'border-dashed', 'border-control', 'border', 'divider', 'chart-axis', 'track',
  'bg-app', 'bg-subtle', 'surface', 'primary', 'primary-strong', 'primary-border', 'primary-soft', 'primary-tint',
  'success', 'success-soft', 'danger', 'danger-soft', 'required', 'accent', 'accent-soft', 'warning', 'warning-soft',
  'chart-main', 'chart-reserve',
];

const FACTION_COLORS = ['axiom', 'bravos', 'lyra', 'muna', 'ordis', 'yzmir'];

const SAMPLE_CARD: Card = {
  reference: 'ALT_EOLE_B_AX_111_C',
  name: 'Shiramun, Techno-moine',
  cardType: { reference: 'CHARACTER', name: 'Personnage' },
  cardSubTypes: [{ name: 'Ingénieur' }],
  faction: { code: 'AX', name: 'Axiom' },
  rarity: { reference: 'COMMON' },
  mainCost: 3,
  recallCost: 2,
};

/** A real unique, as `/api/cards` returns it without `locale`. */
const SAMPLE_UNIQUE: Card = {
  reference: 'ALT_EOLE_B_AX_106_U_10',
  collectorNumberFormatedId: 'ROC-002-U-10',
  name: { fr: 'Salamandre Furtive', en: 'Sneaky Salamander' },
  cardType: { reference: 'CHARACTER', name: { fr: 'Personnage' } },
  cardSubTypes: [{ reference: 'ANIMAL', name: { fr: 'Animal' } }],
  faction: { code: 'AX', name: 'Axiom' },
  rarity: { reference: 'UNIQUE' },
  mainCost: 3,
  recallCost: 2,
  forestPower: 1,
  mountainPower: 3,
  oceanPower: 1,
  mainEffect: {
    fr: '{H} Vous pouvez mettre une carte de votre main en Réserve. Si vous le faites\u00a0: Je gagne 2\u00a0boosts. Sinon, je gagne 1\u00a0boost.  Lorsque je quitte la zone d’Expédition\u00a0— [Sabotez].',
  },
  echoEffect: { fr: '{D}\u00a0: [] [Ravitaillez Épuisé].' },
};

/** `/_ds` — every ar-* component in its variants, in pointer and touch density. */
@Component({
  selector: 'app-ds-page',
  imports: [
    ArButton, ArIconButton, ArLikeButton, ArCardAdd, ArStepper, ArInput, ArSelect, ArSegmented, ArRadioCard, ArCombobox, ArEditableTitle,
    ArChip, ArFilterBar, ArIconToggleGroup, ArBadge, ArTag, ArCount, ArRaritySummary, ArTerrainTotals, ArLogicDivider,
    ArAppBar, ArBackButton, ArTabs, ArBreadcrumb, ArAvatar, ArSiteFooter, ArCardSurface, ArCollapsible, ArFilterSection, ArVirtualGrid,
    ArCardTile, ArDeckRow, ArCostChart, ArDeckSummary, ArEffectSummary, ArExtensionTile, ArHeroTile, ArHeroSelector, ArFactionTabs, ArDeckCard,
    ArUniqueCard,
  ],
  templateUrl: './ds.page.html',
  styleUrl: './ds.page.scss',
})
export class DsPage {
  private readonly doc = inject(DOCUMENT);
  private readonly overlay = inject(ArOverlayService);
  protected readonly colors = COLORS;
  protected readonly factionColors = FACTION_COLORS;
  protected readonly density = signal<'pointer' | 'touch'>((this.doc.documentElement.getAttribute('data-density') as 'pointer' | 'touch') ?? 'pointer');
  protected readonly densityOptions = [
    { value: 'pointer' as const, label: 'Pointeur' },
    { value: 'touch' as const, label: 'Tactile' },
  ];
  protected readonly visibility = signal<string | undefined>('private');
  protected readonly visibilityOptions = [
    { value: 'private', label: 'Privé', icon: 'lock' as const },
    { value: 'public', label: 'Public', icon: 'eye' as const },
  ];
  protected readonly tab = signal('all');
  protected readonly tabs = [
    { id: 'all', label: 'Toutes les cartes' },
    { id: 'uniques', label: 'Uniques' },
    { id: 'owned', label: 'Propriété numérique' },
    { id: 'fav', label: 'Favoris' },
  ];
  /** ar-virtual-grid demo: 2 000 cells, only the rows near the screen are in the DOM. */
  protected readonly cells = Array.from({ length: 2000 }, (_, i) => i + 1);
  protected readonly qty = signal(2);
  protected readonly rarities = signal(['COMMON', 'RARE']);
  protected readonly comboValues = signal<ComboOption[]>([{ id: 1, text: 'Joué depuis la Main', glyph: '\ue023' }]);
  protected readonly comboOptions: ComboOption[] = [
    { id: 1, text: 'Joué depuis la Main', glyph: '\ue023' },
    { id: 5, text: 'Joué depuis la Réserve', glyph: '\ue024' },
    { id: 6, text: 'Joué de partout', glyph: '\ue026' },
    { id: 2, text: 'Au Jour' },
    { id: 3, text: 'À Midi' },
    { id: 4, text: 'Au Crépuscule' },
  ];
  protected readonly conditionValues = signal<ComboOption[]>([]);
  protected readonly conditionOptions: ComboOption[] = [
    { id: 191, text: 'Sans condition' },
    { id: 188, text: 'Si vous contrôlez un jeton' },
    { id: 181, text: 'Si j’ai au moins 1 boost' },
  ];
  protected readonly title = signal('Moyo Embrasement');
  protected readonly card = SAMPLE_CARD;
  protected readonly unique = SAMPLE_UNIQUE;
  protected readonly uniqueQty = signal(0);
  protected readonly effect = {
    ...newEffectBlock(),
    triggers: [
      { id: 1, text: 'Joué depuis la Main', glyph: '\ue023' },
      { id: 2, text: 'Joué de partout', glyph: '\ue026' },
    ],
    conditions: [{ id: 191, text: 'Sans condition' }],
    effects: [{ id: 3, text: 'Ravitaillez. Sinon, ravitaillez épuisé.' }],
  };
  protected readonly sets = setsFor('all').slice(3, 5);
  protected readonly faction = signal('AX');
  protected readonly heroOptions: ArHeroOption[] = [
    { reference: 'ALT_CORE_B_AX_01_C', name: 'Sierra & Oddball', faction: 'AX' },
    { reference: 'ALT_CORE_B_AX_02_C', name: 'Treyst & Rossum', faction: 'AX', unavailableOnBga: true },
    { reference: 'ALT_CORE_B_BR_01_C', name: 'Kojo & Booda', faction: 'BR' },
    { reference: 'ALT_CORE_B_LY_01_C', name: 'Nevenka & Blotch', faction: 'LY' },
    { reference: 'ALT_CORE_B_MU_01_C', name: 'Arjun & Spike', faction: 'MU' },
    { reference: 'ALT_CORE_B_OR_01_C', name: 'Sigismar & Wingspan', faction: 'OR' },
    { reference: 'ALT_CORE_B_YZ_01_C', name: 'Moyo & Silk', faction: 'YZ' },
  ];
  protected readonly heroPick = signal<ArHeroOption | null>(this.heroOptions[0]);
  protected readonly deckItem: DeckListItem = {
    id: 'demo',
    name: 'Moyo Embrasement',
    hero: { reference: 'ALT_CORE_B_YZ_01_C', name: 'Moyo & Silk', faction: 'YZ' },
    format: 'standard',
    formatLabel: 'Standard All Uniques',
    formatTone: 'blue',
    legal: true,
    isPublic: false,
    author: null,
    total: 39,
    rarity: { C: 21, R: 15, U: 3, E: 0 },
    guest: true,
    updatedAt: '',
    likes: 0,
    liked: false,
  };
  protected readonly communityDeckItem: DeckListItem = { ...this.deckItem, id: 'demo-community', isPublic: true, author: 'Yutsa', guest: false, likes: 128, updatedAt: new Date(Date.now() - 2 * 3_600_000).toISOString() };
  protected readonly communityLiked = signal(true);
  protected readonly communityDeck = computed(() => ({ ...this.communityDeckItem, liked: this.communityLiked(), likes: 128 + (this.communityLiked() ? 1 : 0) }));

  setDensity(d: 'pointer' | 'touch' | undefined): void {
    if (!d) return;
    this.density.set(d);
    this.doc.documentElement.setAttribute('data-density', d);
  }

  openDemo(): void {
    this.overlay.open(DsDemoOverlay, { title: 'Titre' });
  }

  /** Left drawer below 768 px; centered window above, like every other overlay. */
  openDrawer(): void {
    this.overlay.open(DsDemoOverlay, { title: 'Tiroir', compact: 'drawer' });
  }
}
