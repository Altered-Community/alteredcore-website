import { Component, computed, inject, output, signal } from '@angular/core';
import { DeckStore } from '../../../core/deck-store';
import { formatInfo } from '../../../core/formats';
import { ArCollapsible, ArProgressBar } from '../../../ui/containers';
import { ArDeckRow, ArDeckStats, ArDeckSummary } from '../../../ui/metier';
import { ArOverlayService } from '../../../ui/overlay';
import { EditorAltArts } from '../editor-alt-arts';
import { openTokenArts } from '../token-arts/token-arts.overlay';
import { ArButton } from '../../../ui/buttons';
import { editorLegality, lineIssues, openEditorLegality } from '../editor-legality';

/** Desktop right-hand panel: embedded summary, Stats, grouped rows with steppers. */
@Component({
  selector: 'app-deck-panel',
  imports: [ArButton, ArProgressBar, ArDeckSummary, ArCollapsible, ArDeckStats, ArDeckRow],
  templateUrl: './deck-panel.html',
  styleUrl: './deck-panel.scss',
})
export class DeckPanel {
  /** Editor only (not the deck page): illustrations used more times than owned. */
  protected readonly altArts = inject(EditorAltArts, { optional: true });
  protected readonly deck = inject(DeckStore);
  private readonly overlay = inject(ArOverlayService);
  readonly openSettings = output<void>();
  protected readonly statsOpen = signal(true);
  protected readonly formatLabel = computed(() => formatInfo(this.deck.format()).label);
  protected readonly legality = computed(() => editorLegality(this.deck));
  /** Progress toward the format's minimum (the site's status strip). */
  protected readonly minCards = computed(() => formatInfo(this.deck.format()).min);
  protected readonly progress = computed(() => Math.min(100, Math.round((this.deck.total() / Math.max(1, this.minCards())) * 100)));
  protected readonly progressLabel = computed(() => $localize`:@@editor.progressLabel:Progression vers le minimum de cartes`);
  protected readonly issues = computed(() => lineIssues(this.deck));
  protected readonly noIssues: readonly string[] = [];

  protected showLegality(): void {
    openEditorLegality(this.overlay, this.deck);
  }

  protected chooseTokenArts(): void {
    openTokenArts(this.overlay);
  }
}
