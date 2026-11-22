import { Component, computed, inject, signal } from '@angular/core';
import type { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { canRank, rankPrints } from '../../../core/alt-art-defaults';
import { cardImageUrl } from '../../../core/card-art';
import type { AltArtChoice } from '../../../core/ownership-api.service';
import { AcButton } from '../../../ui/buttons';
import { AcSegmented, type AcSegment } from '../../../ui/fields';
import { AcOverlayRef, AcOverlayService } from '../../../ui/overlay';
import { printLabel, saveFailed } from '../alt-art-labels';

/** Where a choice of the brush applies: this deck only (its overrides) or every deck (the player's preferences). */
export type AltArtScope = 'deck' | 'global';

export interface AltArtPickerData {
  /** The card's family, with the player's default alt arts. */
  choice: () => AltArtChoice;
  /** The family's copies in the deck, one print a copy. */
  prints: () => readonly string[];
  /** The illustration of the 1st, 2nd and 3rd card in this deck (its own choices, then the player's preferences). */
  cards: () => readonly string[];
  /** The family's copies in the deck, one print a copy, copy 1 first (as on the deck board). */
  copies: () => readonly string[];
  /** The deck chooses its own illustrations for this card (overrides), instead of following the preferences. */
  pinned: () => boolean;
  /** The 1st, 2nd and 3rd card take `cards` for this deck or everywhere; errors reach the caller. */
  setCards: (cards: readonly string[], scope: AltArtScope) => Observable<void>;
  /** The family follows the player's preferences again in this deck. */
  reset: () => void;
}

/**
 * The brush of a card: first where a choice applies, « Ce deck » (the deck's own illustrations, saved with it) or
 * « Partout » (the player's default alt arts, every deck that does not choose its own); then its illustrations, each
 * under three keys, its 1st, 2nd and 3rd card (one a copy). A key pressed is a card that takes this illustration;
 * pressing another key gives the illustration that card. Then what the deck uses. « Utiliser mes arts par défaut »
 * drops the deck's own choice for the card.
 */
@Component({
  selector: 'app-alt-art-picker',
  imports: [AcButton, AcSegmented],
  host: { class: 'ac-overlay-content' },
  templateUrl: './alt-art-picker.overlay.html',
  styleUrl: './alt-art-picker.overlay.scss',
})
export class AltArtPickerOverlay {
  protected readonly ref = inject<AcOverlayRef<void, AltArtPickerData>>(AcOverlayRef);
  private readonly data = this.ref.data!;
  private readonly choice = this.data.choice;
  /** Where the next choice applies: this deck by default. */
  protected readonly scope = signal<AltArtScope>('deck');
  protected readonly scopes: AcSegment<AltArtScope>[] = [
    { value: 'deck', label: $localize`:@@editor.altArtPicker.scopeDeck:Pour ce deck` },
    { value: 'global', label: $localize`:@@editor.altArtPicker.scopeGlobal:Partout` },
  ];
  protected readonly scopeLabel = $localize`:@@editor.altArtPicker.scope:Appliquer le choix`;
  /** The illustration of each card, 1st first: this deck's, or the player's preferences (« Partout »). */
  private readonly ranks = computed(() => (this.scope() === 'deck' ? this.data.cards() : rankPrints(this.choice())));
  private readonly copies = computed(() => this.data.prints().length);
  /** The deck follows the player's preferences for this card. */
  protected readonly followsDefaults = computed(() => !this.data.pinned());
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly cardWord = cardWord();
  /** The site's « Arts alternatifs par défaut » page (plugin ownership). */
  protected readonly settingsUrl = `${environment.siteUrl.replace(/\/$/, '')}/pages/ownership-alt-arts`;

  /** The illustrations in the service's order (the plain print first): a choice does not move them. */
  protected readonly arts = computed(() => {
    const choice = this.choice();
    const ranks = this.ranks();
    return choice.options.options.map((o, i) => {
      const label = printLabel(i + 1);
      return {
        reference: o.reference,
        src: cardImageUrl(o.reference),
        label,
        note: o.ownedQuantity === null ? unlimited() : o.ownedQuantity === 0 ? notOwned() : ownedLabel(o.ownedQuantity),
        unowned: o.ownedQuantity === 0,
        keysLabel: keysLabel(label),
        /** The 1st card on the left, the 2nd in the middle, the 3rd on the right. */
        keys: ranks.map((r, k) => ({
          rank: k,
          num: k + 1,
          suffix: cardSuffix(k),
          label: cardLabel(k),
          pressed: r === o.reference,
          disabled: r !== o.reference && !canRank(choice, ranks, k, o.reference),
        })),
      };
    });
  });

  /** The deck's copies, copy 1 first (as on the deck board). */
  protected readonly preview = computed(() => this.data.copies().map((print) => cardImageUrl(print)));

  protected readonly summary = computed(() => {
    const n = this.copies();
    if (n === 0) return summaryNone();
    return n === 1 ? summaryOne() : n === 2 ? summaryTwo() : summaryAll(n);
  });

  /** Card `rank` takes illustration `reference` in this deck, its copies too. */
  protected choose(reference: string, rank: number): void {
    const ranks = this.ranks();
    if (ranks[rank] === reference || this.saving()) return;
    this.error.set(null);
    this.saving.set(true);
    this.data.setCards(ranks.map((r, k) => (k === rank ? reference : r)), this.scope()).subscribe({
      complete: () => this.saving.set(false),
      error: () => {
        this.saving.set(false);
        this.error.set(saveFailed());
      },
    });
  }

  /** « Utiliser mes arts par défaut »: the card follows the player's preferences again in this deck. */
  protected resetToDefaults(): void {
    this.error.set(null);
    this.data.reset();
  }
}

const cardLabel = (k: number) =>
  k === 0
    ? $localize`:@@editor.altArtPicker.card1:1ère carte`
    : k === 1
      ? $localize`:@@editor.altArtPicker.card2:2ème carte`
      : $localize`:@@editor.altArtPicker.card3:3ème carte`;
/** Ordinal suffix on a key (« 1ère », « 2ème »). */
const cardSuffix = (k: number) =>
  k === 0
    ? $localize`:@@editor.altArtPicker.suffix1:ère`
    : k === 1
      ? $localize`:@@editor.altArtPicker.suffix2:ème`
      : $localize`:@@editor.altArtPicker.suffix3:ème`;
const cardWord = () => $localize`:@@editor.altArtPicker.cardWord:carte`;
const keysLabel = (label: string) => $localize`:@@editor.altArtPicker.menu:Cartes de ${label}:label:`;
const unlimited = () => $localize`:@@editor.altArtPicker.unlimited:Illimitée`;
const notOwned = () => $localize`:@@editor.altArtPicker.notOwned:Non possédée`;
const ownedLabel = (n: number) =>
  n > 1 ? $localize`:@@editor.altArtPicker.ownedMany:${n}:n: possédées` : $localize`:@@editor.altArtPicker.ownedOne:1 possédée`;
const summaryNone = () => $localize`:@@editor.altArtPicker.summaryNone:Ce deck n’a pas encore d’exemplaire de cette carte.`;
const summaryOne = () => $localize`:@@editor.altArtPicker.summaryOne:Avec 1 exemplaire, le deck prend l’illustration de la 1ère carte.`;
const summaryTwo = () => $localize`:@@editor.altArtPicker.summaryTwo:Avec 2 exemplaires, le deck prend les illustrations des 1ère et 2ème cartes.`;
const summaryAll = (n: number) => $localize`:@@editor.altArtPicker.summaryAll:Avec ${n}:n: exemplaires, le deck prend les illustrations des trois cartes.`;

/** The brush of a card of the deck, in its own window (sheet on a phone). */
export function openAltArtPicker(overlay: AcOverlayService, name: string, data: AltArtPickerData): AcOverlayRef<void, AltArtPickerData> {
  const copies = data.prints().length;
  return overlay.open<AltArtPickerOverlay, void, AltArtPickerData>(AltArtPickerOverlay, {
    title: name,
    subtitle: copies > 1 ? $localize`:@@editor.altArtPicker.copiesMany:${copies}:n: exemplaires dans ce deck` : $localize`:@@editor.altArtPicker.copiesOne:1 exemplaire dans ce deck`,
    data,
    width: 1000,
  });
}
