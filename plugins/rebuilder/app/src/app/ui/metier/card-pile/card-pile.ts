import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { isUniqueReference } from '../../../core/card-art';
import { contentLocale } from '../../../core/locale';
import type { Card } from '../../../core/models';
import { localizedText } from '../../../core/models';
import { AcStepper } from '../../buttons';
import { AcIcon } from '../../icon';
import { AcCardArt } from '../card-art/card-art';
import { AcUniqueCard } from '../unique-card/unique-card';

/**
 * A card of the deck board (« Aperçu »): its copies stacked, each one a few pixels lower, « ×n » from 2 copies. Editable:
 * the « − n + » stepper over the card on hover or focus; at 0 the pile stays, faded, until the view is left. A line
 * with legality issues gets an orange ring and marker.
 */
@Component({
  selector: 'ac-card-pile',
  imports: [NgTemplateOutlet, AcCardArt, AcUniqueCard, AcStepper, AcIcon],
  host: {
    role: 'listitem',
    '[class.zero]': 'quantity() === 0',
    '[class.issue]': 'issues().length > 0 && quantity() > 0',
    '[class.editable]': '!readonly()',
    '[style.--pile-behind]': 'behind().length',
  },
  templateUrl: './card-pile.html',
  styleUrl: './card-pile.scss',
})
export class AcCardPile {
  readonly card = input.required<Card>();
  readonly quantity = input(1);
  readonly max = input(3);
  readonly readonly = input(true);
  /** Why the line is not legal (the deck panel's tooltips). */
  readonly issues = input<readonly string[]>([]);
  readonly quantityChange = output<number>();
  /** The card was clicked: the page opens it large. */
  readonly zoom = output<void>();
  /** Brush over the front card (a card with several illustrations, in an editable deck): emits `illustrate`. */
  readonly illustrations = input(false);
  readonly illustrate = output<void>();

  protected readonly name = computed(() => localizedText(this.card().name, contentLocale()) || this.card().reference);
  protected readonly unique = computed(() => isUniqueReference(this.card().reference));
  /** Copies behind the front one (a pile at 0 shows one card). */
  protected readonly behind = computed(() => Array.from({ length: Math.max(0, Math.min(this.quantity(), 3) - 1) }, (_, i) => i));
  protected readonly zoomLabel = computed(() => {
    const n = this.quantity();
    return n === 1
      ? $localize`:@@ui.cardPile.zoomOne:Agrandir ${this.name()}:name:, ${n}:count: exemplaire`
      : $localize`:@@ui.cardPile.zoom:Agrandir ${this.name()}:name:, ${n}:count: exemplaires`;
  });
  protected readonly copiesLabel = computed(() => $localize`:@@ui.cardTile.copiesInDeck:Exemplaires de ${this.name()}:name: dans le deck`);
  protected readonly issueLabel = computed(() => this.issues().join(' · '));
  protected readonly illustrateLabel = computed(() => $localize`:@@ui.cardTile.illustrate:Choisir les illustrations de ${this.name()}:name:`);
}
