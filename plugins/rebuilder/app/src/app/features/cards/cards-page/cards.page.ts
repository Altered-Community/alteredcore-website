import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ArIconButton } from '../../../ui/buttons';
import { ArBreakpointService } from '../../../ui/layout.services';
import { ArAppBar } from '../../../ui/nav';
import { SiteMenuService } from '../../shared/site-menu/site-menu';
import { CardSearchStore } from '../../search/card-search.store';
import { CARD_SOURCES, CardSearch } from '../../search/card-search/card-search';

/** Card browser: the editor's search, filters and results, with a faction filter and no « + » on the cards. */
@Component({
  selector: 'app-cards-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CardSearchStore],
  imports: [ArAppBar, ArIconButton, CardSearch],
  templateUrl: './cards.page.html',
  styleUrl: './cards.page.scss',
})
export class CardsPage {
  protected readonly bp = inject(ArBreakpointService);
  protected readonly menu = inject(SiteMenuService);
  /** « Propriété numérique » and « Favoris » need an account and a deck context: not in the browser. */
  protected readonly sources = CARD_SOURCES.filter((s) => s.id === 'all' || s.id === 'uniques');
}
