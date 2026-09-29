import { Component, computed, inject, input, signal } from '@angular/core';
import { DeckStore } from '../../../core/deck-store';
import { AcButton } from '../../../ui/buttons';
import { AcCardTile, AcDeckSection } from '../../../ui/metier';

/** « Aperçu » / « Cartes »: count line, « Tout replier », one section per type with tiles. */
@Component({
  selector: 'app-deck-preview',
  imports: [AcDeckSection, AcCardTile, AcButton],
  templateUrl: './deck-preview.html',
  styleUrl: './deck-preview.scss',
})
export class DeckPreview {
  protected readonly deck = inject(DeckStore);
  readonly readonly = input(false);
  /** Three columns on compact (consultation « Cartes »). */
  readonly dense = input(false);
  protected readonly closed = signal(new Set<string>());
  protected readonly allClosed = computed(() => this.deck.groups().length > 0 && this.deck.groups().every((g) => this.closed().has(g.id)));

  setOpen(id: string, open: boolean): void {
    this.closed.update((s) => {
      const next = new Set(s);
      if (open) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  toggleAll(): void {
    this.closed.set(this.allClosed() ? new Set() : new Set(this.deck.groups().map((g) => g.id)));
  }
}
