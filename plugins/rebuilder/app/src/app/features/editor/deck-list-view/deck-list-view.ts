import { Component, computed, inject, input, output, signal } from '@angular/core';
import { DeckStore } from '../../../core/deck-store';
import { formatInfo } from '../../../core/formats';
import { AcCollapsible } from '../../../ui/containers';
import { AcDeckRow, AcDeckSection, AcDeckStats, AcDeckSummary } from '../../../ui/metier';

/** Mobile « Mon deck »: summary card, Stats card, flat grouped lists (steppers or read-only). */
@Component({
  selector: 'app-deck-list-view',
  imports: [AcDeckSummary, AcCollapsible, AcDeckStats, AcDeckRow, AcDeckSection],
  templateUrl: './deck-list-view.html',
  styleUrl: './deck-list-view.scss',
})
export class DeckListView {
  protected readonly deck = inject(DeckStore);
  readonly readonly = input(false);
  readonly openSettings = output<void>();
  protected readonly statsOpen = signal(true);
  protected readonly formatLabel = computed(() => formatInfo(this.deck.format()).label);
}
