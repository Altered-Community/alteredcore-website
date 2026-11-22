import { Component, inject } from '@angular/core';
import { AcBreakpointService } from '../../../ui/layout.services';
import { AcAppBar } from '../../../ui/nav';
import { CardSearchStore } from '../../search/card-search.store';
import { CardSearch } from '../../search/card-search/card-search';

/**
 * Card browser (`/pages/cards`, in place of the site's card search with « Beta Deckbuilder »): the editor's search, filters
 * and results, with a faction filter and no quantity controls on the cards.
 */
@Component({
  selector: 'app-cards-page',
  providers: [CardSearchStore],
  imports: [AcAppBar, CardSearch],
  templateUrl: './cards.page.html',
  styleUrl: './cards.page.scss',
})
export class CardsPage {
  protected readonly bp = inject(AcBreakpointService);
}
