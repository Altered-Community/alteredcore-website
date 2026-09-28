import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { DeckStore } from '../../../core/deck-store';
import { formatInfo } from '../../../core/formats';
import { t } from '../../../core/i18n';
import { ArCollapsible } from '../../../ui/containers';
import { ArDeckRow, ArDeckStats, ArDeckSummary } from '../../../ui/metier';

/** Desktop right-hand panel: embedded summary, Stats, grouped rows with steppers. */
@Component({
  selector: 'app-deck-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArDeckSummary, ArCollapsible, ArDeckStats, ArDeckRow],
  templateUrl: './deck-panel.html',
  styleUrl: './deck-panel.scss',
})
export class DeckPanel {
  protected readonly deck = inject(DeckStore);
  readonly openSettings = output<void>();
  protected readonly statsOpen = signal(true);
  protected readonly t = t;
  protected readonly formatLabel = computed(() => formatInfo(this.deck.format()).label);
}
