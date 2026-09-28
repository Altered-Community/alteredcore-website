import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DECK_NOTES, type DeckNote } from '../../../core/deck-notes';
import { t } from '../../../core/i18n';
import { ArButton } from '../../../ui/buttons';
import { ArCollapsible } from '../../../ui/containers';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/** The user's private note on an account deck (site build only: needs a DECK_NOTES provider). */
@Component({
  selector: 'app-deck-notes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArCollapsible, ArButton],
  templateUrl: './deck-notes.html',
  styleUrl: './deck-notes.scss',
})
export class DeckNotes {
  private readonly api = inject(DECK_NOTES);
  private readonly destroyRef = inject(DestroyRef);
  readonly deckId = input.required<string>();
  protected readonly t = t;
  protected readonly open = signal(false);
  protected readonly body = signal('');
  protected readonly loaded = signal(false);
  protected readonly state = signal<SaveState>('idle');

  constructor() {
    effect((onCleanup) => {
      const id = this.deckId();
      this.loaded.set(false);
      this.state.set('idle');
      const sub = this.api.get(id).subscribe({
        next: (note) => this.apply(note),
        error: () => this.loaded.set(true),
      });
      onCleanup(() => sub.unsubscribe());
    });
  }

  protected edit(value: string): void {
    this.body.set(value);
    this.state.set('idle');
  }

  protected save(): void {
    this.state.set('saving');
    this.api
      .save(this.deckId(), this.body())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (note) => {
          this.apply(note);
          this.state.set('saved');
        },
        error: () => this.state.set('error'),
      });
  }

  private apply(note: DeckNote): void {
    this.body.set(note.body);
    this.loaded.set(true);
    if (note.body) this.open.set(true);
  }
}
