import { CdkMenu, CdkMenuItemRadio, CdkMenuTrigger } from '@angular/cdk/menu';
import type { ConnectedPosition } from '@angular/cdk/overlay';
import { Component, computed, inject, signal } from '@angular/core';
import type { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { canRank, defaultPrints, rankPrints, sameCopies } from '../../../core/alt-art-defaults';
import { cardImageUrl } from '../../../core/card-art';
import type { AltArtChoice } from '../../../core/ownership-api.service';
import { AcButton } from '../../../ui/buttons';
import { AcIcon } from '../../../ui/icon';
import { AcOverlayRef, AcOverlayService } from '../../../ui/overlay';

export interface AltArtPickerData {
  /** The card's family, with the player's default alt arts. */
  choice: () => AltArtChoice;
  /** The family's copies in the deck, one print a copy. */
  prints: () => readonly string[];
  /** The illustration of the 1st, 2nd and 3rd card in this deck. */
  cards: () => readonly string[];
  /** The family's copies in the deck, one print a copy, copy 1 first (as on the deck board). */
  copies: () => readonly string[];
  /** The 1st, 2nd and 3rd card take `cards` in this deck, its copies too; errors reach the caller. */
  setCards: (cards: readonly string[]) => Observable<void>;
  /** The family follows the default alt arts again in this deck. */
  reset: () => void;
}

/** The choices' menu: over the bottom of the illustration, under it when there is no room. */
const MENU_POSITIONS: ConnectedPosition[] = [
  { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'bottom', offsetY: -8 },
  { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: 8 },
];

/**
 * The brush of a card: its illustrations, each with the cards it is chosen for in this deck (1st, 2nd, 3rd card, one a
 * copy), and what the deck uses (with 2 copies, the 1st and 2nd cards; an added copy takes the 3rd card's). A change
 * here is for this deck only: its copies take it at once, the player's default alt arts stay as they are.
 */
@Component({
  selector: 'app-alt-art-picker',
  imports: [AcButton, AcIcon, CdkMenuTrigger, CdkMenu, CdkMenuItemRadio],
  host: { class: 'ac-overlay-content' },
  templateUrl: './alt-art-picker.overlay.html',
  styleUrl: './alt-art-picker.overlay.scss',
})
export class AltArtPickerOverlay {
  protected readonly ref = inject<AcOverlayRef<void, AltArtPickerData>>(AcOverlayRef);
  private readonly data = this.ref.data!;
  private readonly choice = this.data.choice;
  /** The illustration of each card in this deck, 1st first. */
  private readonly ranks = this.data.cards;
  private readonly copies = computed(() => this.data.prints().length);
  /** The deck's cards and copies are the default alt arts. */
  protected readonly followsDefaults = computed(
    () => this.ranks().join() === rankPrints(this.choice()).join() && sameCopies(this.data.prints(), defaultPrints(this.choice(), this.copies())),
  );
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly positions = MENU_POSITIONS;
  protected readonly cardWord = cardWord();
  /** The site's « Arts alternatifs par défaut » page (plugin ownership). */
  protected readonly settingsUrl = `${environment.siteUrl.replace(/\/$/, '')}/pages/ownership-alt-arts`;

  /** The illustrations in the service's order (the plain print first): a choice does not move them. */
  protected readonly arts = computed(() => {
    const choice = this.choice();
    const ranks = this.ranks();
    return choice.options.options.map((o, i) => {
      const label = printLabel(i + 1);
      const held = ranks.flatMap((r, k) => (r === o.reference ? [k] : []));
      return {
        reference: o.reference,
        src: cardImageUrl(o.reference),
        label,
        note: o.ownedQuantity === null ? unlimited() : o.ownedQuantity === 0 ? notOwned() : ownedLabel(o.ownedQuantity),
        unowned: o.ownedQuantity === 0,
        ariaLabel: artLabel([label, ...held.map(cardLabel)].join(', ')),
        menuLabel: menuLabel(label),
        ribbons: held.map((k) => ({
          rank: k,
          num: k + 1,
          suffix: cardSuffix(k),
        })),
        options: ranks.map((r, k) => ({
          rank: k,
          label: cardLabel(k),
          checked: r === o.reference,
          disabled: !canRank(choice, ranks, k, o.reference),
          holder: cardImageUrl(r),
        })),
      };
    });
  });

  /** The illustration whose menu is open (the CDK keeps a menu's first context: the menu reads it from here). */
  protected readonly menuFor = signal<string | null>(null);
  protected readonly menuArt = computed(() => this.arts().find((a) => a.reference === this.menuFor()) ?? null);

  /** The deck's copies, copy 1 first (as on the deck board). */
  protected readonly preview = computed(() => this.data.copies().map((print) => cardImageUrl(print)));

  protected readonly summary = computed(() => {
    const n = this.copies();
    if (n === 0) return summaryNone();
    return n === 1 ? summaryOne() : n === 2 ? summaryTwo() : summaryAll(n);
  });

  /** Card `rank` takes the illustration of the open menu in this deck, its copies too. */
  protected choose(rank: number): void {
    const reference = this.menuFor();
    const ranks = this.ranks();
    if (reference === null || ranks[rank] === reference || this.saving()) return;
    this.error.set(null);
    this.saving.set(true);
    this.data.setCards(ranks.map((r, k) => (k === rank ? reference : r))).subscribe({
      complete: () => this.saving.set(false),
      error: () => {
        this.saving.set(false);
        this.error.set(saveFailed());
      },
    });
  }

  /** « Arts par défaut »: the card follows the default alt arts again in this deck. */
  protected resetToDefaults(): void {
    this.error.set(null);
    this.data.reset();
  }
}

const printLabel = (n: number) => $localize`:@@altArt.tile:Illustration ${n}:n:`;
const cardLabel = (k: number) =>
  k === 0
    ? $localize`:@@editor.altArtPicker.card1:1ère carte`
    : k === 1
      ? $localize`:@@editor.altArtPicker.card2:2ème carte`
      : $localize`:@@editor.altArtPicker.card3:3ème carte`;
/** Ordinal suffix on a ribbon (« 1ère », « 2ème »). */
const cardSuffix = (k: number) =>
  k === 0
    ? $localize`:@@editor.altArtPicker.suffix1:ère`
    : k === 1
      ? $localize`:@@editor.altArtPicker.suffix2:ème`
      : $localize`:@@editor.altArtPicker.suffix3:ème`;
const cardWord = () => $localize`:@@editor.altArtPicker.cardWord:carte`;
const artLabel = (text: string) => $localize`:@@editor.altArtPicker.art:${text}:text: : choisir ses cartes`;
const menuLabel = (label: string) => $localize`:@@editor.altArtPicker.menu:Cartes de ${label}:label:`;
const unlimited = () => $localize`:@@editor.altArtPicker.unlimited:Illimitée`;
const notOwned = () => $localize`:@@editor.altArtPicker.notOwned:Non possédée`;
const ownedLabel = (n: number) =>
  n > 1 ? $localize`:@@editor.altArtPicker.ownedMany:${n}:n: possédées` : $localize`:@@editor.altArtPicker.ownedOne:1 possédée`;
const summaryNone = () => $localize`:@@editor.altArtPicker.summaryNone:Ce deck n’a pas encore d’exemplaire de cette carte.`;
const summaryOne = () => $localize`:@@editor.altArtPicker.summaryOne:Avec 1 exemplaire, le deck prend l’illustration de la 1ère carte.`;
const summaryTwo = () => $localize`:@@editor.altArtPicker.summaryTwo:Avec 2 exemplaires, le deck prend les illustrations des 1ère et 2ème cartes.`;
const summaryAll = (n: number) => $localize`:@@editor.altArtPicker.summaryAll:Avec ${n}:n: exemplaires, le deck prend les illustrations des trois cartes.`;
const saveFailed = () => $localize`:@@altArt.saveError:Impossible d’enregistrer votre choix.`;

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
