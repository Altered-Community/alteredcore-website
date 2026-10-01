import { Component, computed, input, output } from '@angular/core';
import { rarityOf } from '../../../core/deck-rules';
import type { Card } from '../../../core/models';
import { localizedText } from '../../../core/models';
import { ArStepper } from '../../buttons';
import { ArBadge, rarityIcon } from '../../chips';
import { ArIcon } from '../../icon';
import { contentLocale } from '../../../core/locale';

/** Deck row: rarity icon, name, rule marker, stepper (edit) or ×n + costs (read-only). */
@Component({
  selector: 'ar-deck-row',
  imports: [ArStepper, ArIcon, ArBadge],
  host: {
    '[class.readonly]': 'readonly() || plain()',
    '[class.panel]': "appearance() === 'panel'",
    '[class.invalid]': 'issues().length > 0',
  },
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
  /** Rules this line breaks (off-faction, too many copies, banned…): alert marker with the reasons. */
  readonly issues = input<readonly string[]>([]);
  /** A warning that does not break a rule (an illustration used more times than owned): amber marker. */
  readonly warning = input<string | null>(null);
  /** Why the card cannot be added (`max` is 0), shown in place of the stepper. */
  readonly blockedReason = input<string | null>(null);
  readonly quantityChange = output<number>();
  protected readonly name = computed(() => localizedText(this.card().name, contentLocale()) || this.card().reference);
  protected readonly rarity = computed(() => rarityIcon(rarityOf(this.card())));
  protected readonly issuesLabel = computed(() => this.issues().join(' · '));
  protected readonly blocked = computed(() => !!this.blockedReason() && this.max() === 0 && this.quantity() === 0);
  protected readonly blockedShort = $localize`:@@ui.deckRow.blocked:Interdite`;
}
