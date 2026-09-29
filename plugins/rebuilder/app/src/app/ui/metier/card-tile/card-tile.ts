import { Component, computed, input, output } from '@angular/core';
import { isUniqueReference } from '../../../core/card-art';
import type { Card } from '../../../core/models';
import { localizedText } from '../../../core/models';
import { AcCardAdd, AcStepper } from '../../buttons';
import { AcCardArt } from '../card-art/card-art';
import { AcUniqueCard } from '../unique-card/unique-card';
import { contentLocale } from '../../../core/locale';

/** Search / preview / consultation tile — ac-card-tile (DS-Metier). */
@Component({
  selector: 'ac-card-tile',
  imports: [AcCardArt, AcCardAdd, AcStepper, AcUniqueCard],
  host: { role: 'article', '[attr.aria-label]': 'name()' },
  templateUrl: './card-tile.html',
  styleUrl: './card-tile.scss',
})
export class AcCardTile {
  readonly card = input.required<Card>();
  readonly quantity = input(0);
  readonly max = input(3);
  readonly readonly = input(false);
  /** Card browser: the card alone, without « + », stepper or ×n. */
  readonly plain = input(false);
  readonly eager = input(false);
  readonly quantityChange = output<number>();

  protected readonly name = computed(() => localizedText(this.card().name, contentLocale()) || this.card().reference);
  protected readonly unique = computed(() => isUniqueReference(this.card().reference));
}
