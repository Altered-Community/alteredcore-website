import { Component, inject } from '@angular/core';
import { AcSkeleton } from '../../../ui/containers';
import { AcBreakpointService } from '../../../ui/layout.services';

/**
 * « Main de départ » while the deck opens (DeckStore.opening): the test hand's toolbar, a hand of cards and the stats
 * panels, in their layout, rather than an empty deck.
 */
@Component({
  selector: 'app-hand-skeleton',
  imports: [AcSkeleton],
  host: { 'aria-busy': 'true' },
  templateUrl: './hand-skeleton.html',
  styleUrl: './hand-skeleton.scss',
})
export class HandSkeleton {
  protected readonly bp = inject(AcBreakpointService);
}
