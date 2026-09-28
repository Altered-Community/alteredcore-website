import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { AuthSession } from '../../../core/auth-session';
import { DECK_NOTES } from '../../../core/deck-notes';
import { DeckStore } from '../../../core/deck-store';
import { formatInfo } from '../../../core/formats';
import { t } from '../../../core/i18n';
import { ArCollapsible } from '../../../ui/containers';
import { ArDeckRow, ArDeckStats, ArDeckSummary } from '../../../ui/metier';
import { DeckNotes } from '../deck-notes/deck-notes';

/** Desktop right-hand panel: embedded summary, Stats, grouped rows with steppers. */
@Component({
  selector: 'app-deck-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArDeckSummary, ArCollapsible, ArDeckStats, ArDeckRow, DeckNotes],
  templateUrl: './deck-panel.html',
  styleUrl: './deck-panel.scss',
})
export class DeckPanel {
  protected readonly deck = inject(DeckStore);
  readonly openSettings = output<void>();
  protected readonly statsOpen = signal(true);
  protected readonly t = t;
  protected readonly formatLabel = computed(() => formatInfo(this.deck.format()).label);
  private readonly hasNotes = !!inject(DECK_NOTES, { optional: true });
  private readonly auth = inject(AuthSession);
  /** Notes are kept for the signed-in user's account decks, when the build provides them (site). */
  protected readonly notesDeckId = computed(() =>
    this.hasNotes && !this.deck.isGuest() && this.auth.isLoggedIn() ? this.deck.deckId() : null,
  );
}
