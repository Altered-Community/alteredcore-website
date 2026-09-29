import { Component, computed, input, output } from '@angular/core';
import { isUniqueReference } from '../../../core/card-art';
import type { Card } from '../../../core/models';
import { localizedText } from '../../../core/models';
import { ArCardAdd, ArStepper } from '../../buttons';
import { ArCardArt } from '../card-art/card-art';
import { ArUniqueCard } from '../unique-card/unique-card';
import { contentLocale } from '../../../core/locale';

/** Search / preview / consultation tile — ar-card-tile (DS-Metier). */
@Component({
  selector: 'ar-card-tile',
  imports: [ArCardArt, ArCardAdd, ArStepper, ArUniqueCard],
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
  readonly quantityChange = output<number>();

  protected readonly name = computed(() => localizedText(this.card().name, contentLocale()) || this.card().reference);
  protected readonly unique = computed(() => isUniqueReference(this.card().reference));
}
