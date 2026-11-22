import { Component, computed, inject } from '@angular/core';
import { DeckStore } from '../../../core/deck-store';
import { AcDeckRow } from '../../../ui/metier';
import { EditorAltArts } from '../editor-alt-arts';
import { lineIssues } from '../editor-legality';
import { AcSkeleton } from '../../../ui/containers';

/** Desktop right-hand panel of the editor: the deck's cards grouped by type, with steppers (the deck bar holds the rest). */
@Component({
  selector: 'app-deck-panel',
  imports: [AcDeckRow, AcSkeleton],
  templateUrl: './deck-panel.html',
  styleUrl: './deck-panel.scss',
})
export class DeckPanel {
  /** Illustrations used more times than owned. */
  protected readonly altArts = inject(EditorAltArts, { optional: true });
  protected readonly deck = inject(DeckStore);
  protected readonly issues = computed(() => lineIssues(this.deck));
  protected readonly noIssues: readonly string[] = [];
}
