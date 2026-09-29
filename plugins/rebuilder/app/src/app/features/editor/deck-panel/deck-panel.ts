import { Component, computed, inject, output, signal } from '@angular/core';
import { DeckStore } from '../../../core/deck-store';
import { formatInfo } from '../../../core/formats';
import { ArCollapsible } from '../../../ui/containers';
import { ArDeckRow, ArDeckStats, ArDeckSummary } from '../../../ui/metier';
import { ArOverlayService } from '../../../ui/overlay';
import { editorLegality, lineIssues, openEditorLegality } from '../editor-legality';

/** Desktop right-hand panel: embedded summary, Stats, grouped rows with steppers. */
@Component({
  selector: 'app-deck-panel',
  imports: [ArDeckSummary, ArCollapsible, ArDeckStats, ArDeckRow],
  templateUrl: './deck-panel.html',
  styleUrl: './deck-panel.scss',
})
export class DeckPanel {
  protected readonly deck = inject(DeckStore);
  private readonly overlay = inject(ArOverlayService);
  readonly openSettings = output<void>();
  protected readonly statsOpen = signal(true);
  protected readonly formatLabel = computed(() => formatInfo(this.deck.format()).label);
  protected readonly legality = computed(() => editorLegality(this.deck));
  protected readonly issues = computed(() => lineIssues(this.deck));
  protected readonly noIssues: readonly string[] = [];

  protected showLegality(): void {
    openEditorLegality(this.overlay, this.deck);
  }
}
