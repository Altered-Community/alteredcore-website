import { Component, computed, inject, input } from '@angular/core';
import { rarityOf, typeOf } from '../../../core/deck-rules';
import type { DeckGroup } from '../../../core/deck-view';
import type { HydratedLine } from '../../../core/models';
import { contentLocale } from '../../../core/locale';
import { localizedText } from '../../../core/models';
import { rarityIcon } from '../../../ui/chips';
import { ArOverlayService } from '../../../ui/overlay';
import { openCardZoom } from '../../shared/card-zoom/card-zoom.overlay';

/** Desktop decklist card: Qté · Carte · Coût · Forêt / Montagne / Océan. */
@Component({
  selector: 'app-decklist-table',
  templateUrl: './decklist-table.html',
  styleUrl: './decklist-table.scss',
})
export class DecklistTable {
  private readonly overlay = inject(ArOverlayService);
  readonly group = input.required<DeckGroup>();
  protected readonly rows = computed(() => this.group().lines.map(toRow));

  /** A card name: the card large, as on the site's decklist. */
  protected zoom(ref: string): void {
    const line = this.group().lines.find((l) => l.card.reference === ref);
    if (line) openCardZoom(this.overlay, { card: line.card });
  }
}

function toRow(l: HydratedLine) {
  const character = typeOf(l.card) === 'CHARACTER';
  const power = (v: number | null | undefined) => (character ? String(v ?? 0) : '—');
  return {
    ref: l.card.reference,
    qty: l.quantity,
    name: localizedText(l.card.name, contentLocale()) || l.card.reference,
    icon: rarityIcon(rarityOf(l.card)),
    main: l.card.mainCost ?? '–',
    res: l.card.recallCost ?? '–',
    f: power(l.card.forestPower),
    m: power(l.card.mountainPower),
    o: power(l.card.oceanPower),
  };
}
