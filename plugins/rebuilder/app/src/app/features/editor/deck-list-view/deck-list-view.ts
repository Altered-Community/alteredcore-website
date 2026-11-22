import { Component, computed, inject, input, output, signal } from '@angular/core';
import { DeckStore } from '../../../core/deck-store';
import { formatInfo } from '../../../core/formats';
import { AcCollapsible, AcSkeleton } from '../../../ui/containers';
import { AcDeckRow, AcDeckSection, AcDeckStats, AcDeckSummary } from '../../../ui/metier';
import { AcOverlayService } from '../../../ui/overlay';
import { EditorAltArts, confirmAltArtDefaults } from '../editor-alt-arts';
import { openTokenArts } from '../token-arts/token-arts.overlay';
import { AcButton } from '../../../ui/buttons';
import { editorLegality, lineIssues, openEditorLegality } from '../editor-legality';

/** Mobile « Mon deck »: summary card, Stats card, flat grouped lists (steppers or read-only). */
@Component({
  selector: 'app-deck-list-view',
  imports: [AcDeckSummary, AcCollapsible, AcDeckStats, AcDeckRow, AcDeckSection, AcButton, AcSkeleton],
  templateUrl: './deck-list-view.html',
  styleUrl: './deck-list-view.scss',
})
export class DeckListView {
  /** Editor only (not the deck page): illustrations used more times than owned. */
  protected readonly altArts = inject(EditorAltArts, { optional: true });
  protected readonly deck = inject(DeckStore);
  private readonly overlay = inject(AcOverlayService);
  readonly readonly = input(false);
  readonly openSettings = output<void>();
  readonly changeHero = output<void>();
  /** A message for the page's notice (« Arts par défaut »). */
  readonly notice = output<string>();
  protected readonly statsOpen = signal(true);
  protected readonly formatLabel = computed(() => formatInfo(this.deck.format()).label);
  protected readonly legality = computed(() => editorLegality(this.deck));
  protected readonly issues = computed(() => lineIssues(this.deck));
  protected readonly noIssues: readonly string[] = [];

  protected showLegality(): void {
    openEditorLegality(this.overlay, this.deck);
  }

  protected chooseTokenArts(): void {
    openTokenArts(this.overlay);
  }

  protected applyDefaults(): void {
    if (!this.altArts) return;
    confirmAltArtDefaults(this.overlay, this.altArts).subscribe((message) => {
      if (message) this.notice.emit(message);
    });
  }
}
