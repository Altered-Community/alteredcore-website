import { Component, computed, inject, output, signal } from '@angular/core';
import { DeckStore } from '../../../core/deck-store';
import { formatInfo } from '../../../core/formats';
import { AcCollapsible } from '../../../ui/containers';
import { AcDeckRow, AcDeckStats, AcDeckSummary } from '../../../ui/metier';

/** Desktop right-hand panel: embedded summary, Stats, grouped rows with steppers. */
@Component({
  selector: 'app-deck-panel',
  imports: [AcDeckSummary, AcCollapsible, AcDeckStats, AcDeckRow],
  templateUrl: './deck-panel.html',
  styleUrl: './deck-panel.scss',
})
export class DeckPanel {
  protected readonly deck = inject(DeckStore);
  readonly openSettings = output<void>();
  protected readonly statsOpen = signal(true);
  protected readonly formatLabel = computed(() => formatInfo(this.deck.format()).label);
}
