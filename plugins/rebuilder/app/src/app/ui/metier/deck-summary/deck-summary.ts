import { Component, computed, input, output } from '@angular/core';
import { type RarityCounts } from '../../../core/deck-rules';
import type { DeckHero } from '../../../core/models';
import { ArIconButton } from '../../buttons';
import { ArBadge, ArRaritySummary } from '../../chips';
import { ArIcon } from '../../icon';
import { ArCardArt } from '../card-art/card-art';

/** Hero thumbnail + deck meta + counters; the settings button opens « Réglages du deck ». */
@Component({
  selector: 'ar-deck-summary',
  imports: [ArCardArt, ArIcon, ArIconButton, ArRaritySummary, ArBadge],
  host: { '[class]': "'ar-deck-summary--' + appearance()" },
  templateUrl: './deck-summary.html',
  styleUrl: './deck-summary.scss',
})
export class ArDeckSummary {
  readonly name = input('');
  readonly hero = input<DeckHero | null>(null);
  readonly formatLabel = input('');
  readonly isPublic = input(false);
  readonly total = input(0);
  readonly legal = input(false);
  readonly issues = input<string[]>([]);
  readonly rarity = input.required<RarityCounts>();
  readonly appearance = input<'card' | 'embedded'>('card');
  readonly editable = input(true);
  readonly openSettings = output<void>();

  protected readonly noHero = $localize`:@@ui.deckSummary.noHero:Aucun héros`;
  protected readonly publicLabel = $localize`:@@ui.deckSummary.public:Public`;
  protected readonly privateLabel = $localize`:@@ui.deckSummary.private:Privé`;
  protected readonly issueLabel = computed(() => {
    const size = this.issues().find((i) => i.startsWith('size'));
    if (!this.hero()) return $localize`:@@ui.deckSummary.missingHero:Héros manquant`;
    if (size) return $localize`:@@ui.deckSummary.invalidSize:Taille invalide`;
    return $localize`:@@ui.deckSummary.invalid:Non valide`;
  });
}
