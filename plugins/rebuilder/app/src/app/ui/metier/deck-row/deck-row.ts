import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { rarityOf } from '../../../core/deck-rules';
import type { Card } from '../../../core/models';
import { localizedText } from '../../../core/models';
import { ArStepper } from '../../buttons';
import { rarityIcon } from '../../chips';
import { contentLocale } from '../../../core/locale';

/** Deck row: rarity icon, name, stepper (edit) or ×n + costs (read-only). */
@Component({
  selector: 'ar-deck-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArStepper],
  host: { '[class.readonly]': 'readonly() || plain()', '[class.panel]': "appearance() === 'panel'" },
  templateUrl: './deck-row.html',
  styleUrl: './deck-row.scss',
})
export class ArDeckRow {
  readonly card = input.required<Card>();
  readonly quantity = input(0);
  readonly max = input(3);
  readonly readonly = input(false);
  /** Card browser: rarity, name and costs, without quantity. */
  readonly plain = input(false);
  readonly appearance = input<'list' | 'panel'>('list');
  readonly quantityChange = output<number>();
  protected readonly name = computed(() => localizedText(this.card().name, contentLocale()) || this.card().reference);
  protected readonly rarity = computed(() => rarityIcon(rarityOf(this.card())));
}
