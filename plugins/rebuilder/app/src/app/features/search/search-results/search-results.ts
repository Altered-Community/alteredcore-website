import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DeckStore } from '../../../core/deck-store';
import { ArButton } from '../../../ui/buttons';
import { ArVirtualGrid } from '../../../ui/containers';
import { ArInfiniteSentinel } from '../../../ui/infinite';
import { ArCardTile, ArDeckRow } from '../../../ui/metier';
import { CardSearchStore } from '../card-search.store';

@Component({
  selector: 'app-search-results',
  imports: [ArCardTile, ArDeckRow, ArInfiniteSentinel, ArButton, RouterLink, ArVirtualGrid],
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

}
