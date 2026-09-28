import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DeckStore } from '../../../core/deck-store';
import type { Card } from '../../../core/models';
import { ArButton } from '../../../ui/buttons';
import { ArInfiniteSentinel } from '../../../ui/infinite';
import { ArCardTile, ArDeckRow } from '../../../ui/metier';
import { CardSearchStore } from '../card-search.store';

@Component({
  selector: 'app-search-results',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArCardTile, ArDeckRow, ArInfiniteSentinel, ArButton, RouterLink],
  templateUrl: './search-results.html',
  styleUrl: './search-results.scss',
})
export class SearchResults {
  protected readonly search = inject(CardSearchStore);
  protected readonly deck = inject(DeckStore);
  readonly layout = input<'grid' | 'list'>('grid');
  /** Card browser: cards without quantity controls. */
  readonly browse = input(false);
  protected readonly skeletons = computed(() => Array.from({ length: this.search.cards().length ? 3 : 6 }));

  trackCard(_: number, c: Card): string {
    return c.reference;
  }
}
