import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { isUniqueReference } from '../../../core/card-art';
import type { Card } from '../../../core/models';
import { localizedText } from '../../../core/models';
import { ArCardAdd, ArStepper } from '../../buttons';
import { ArBadge } from '../../chips';
import { ArCardArt } from '../card-art/card-art';
import { ArUniqueCard } from '../unique-card/unique-card';
import { contentLocale } from '../../../core/locale';

/** Search / preview / consultation tile — ar-card-tile (DS-Metier). */
@Component({
  selector: 'ar-card-tile',
  imports: [NgTemplateOutlet, ArCardArt, ArCardAdd, ArStepper, ArUniqueCard, ArBadge],
  host: { role: 'article', '[attr.aria-label]': 'name()' },
  templateUrl: './card-tile.html',
  styleUrl: './card-tile.scss',
})
export class ArCardTile {
  readonly card = input.required<Card>();
  readonly quantity = input(0);
  readonly max = input(3);
  readonly readonly = input(false);
  /** Card browser: the card alone, without « + », stepper or ×n. */
  readonly plain = input(false);
  readonly eager = input(false);
  /** Why the card cannot be added (`max` is 0), shown in place of « + ». */
  readonly blockedReason = input<string | null>(null);
  readonly quantityChange = output<number>();
  /** The visual is a button that emits `zoom` (the page opens the card large). */
  readonly zoomable = input(false);
  readonly zoom = output<void>();

  protected readonly blockedShort = $localize`:@@ui.deckRow.blocked:Interdite`;
  protected readonly name = computed(() => localizedText(this.card().name, contentLocale()) || this.card().reference);
  protected readonly zoomLabel = computed(() => $localize`:@@ui.cardTile.zoom:Agrandir ${this.name()}:name:`);
  protected readonly addLabel = computed(() => $localize`:@@ui.cardTile.add:Ajouter ${this.name()}:name: au deck`);
  protected readonly copiesLabel = computed(() => $localize`:@@ui.cardTile.copiesInDeck:Exemplaires de ${this.name()}:name: dans le deck`);
  protected readonly quantityLabel = computed(() => {
    const n = this.quantity();
    return n === 1 ? $localize`:@@ui.cardTile.quantityOne:${n}:count: exemplaire(s)` : $localize`:@@ui.cardTile.quantity:${n}:count: exemplaire(s)`;
  });
  protected readonly unique = computed(() => isUniqueReference(this.card().reference));
}
