import { Component, inject, signal } from '@angular/core';
import { ArButton } from '../../../ui/buttons';
import { ArChip } from '../../../ui/chips';
import { ArSegmented, ArSelect } from '../../../ui/fields';
import { FACTIONS } from '../../../ui/metier';
import { ArOverlayRef } from '../../../ui/overlay';
import { type Visibility, type DeckFilters, EMPTY_DECK_FILTERS } from '../deck-filters';

/** Mobile filter sheet for Mes decks (format, héros, visibilité, faction). */
@Component({
  selector: 'app-deck-filters-sheet',
  imports: [ArSelect, ArSegmented, ArChip, ArButton],
  host: { class: 'ar-overlay-content' },
  templateUrl: './deck-filters-sheet.html',
  styleUrl: './deck-filters-sheet.scss',
})
export class DeckFiltersSheet {
  protected readonly ref = inject<
    ArOverlayRef<DeckFilters, { filters: DeckFilters; formats: { value: string; label: string }[]; heroes: { value: string; label: string }[]; visibilities: { value: Visibility; label: string }[]; showVisibility: boolean }>
  >(ArOverlayRef);
  protected readonly draft = signal<DeckFilters>(this.ref.data.filters);
  protected readonly factions = FACTIONS;
  protected readonly empty = EMPTY_DECK_FILTERS;
  patch(p: Partial<DeckFilters>): void {
    this.draft.update((d) => ({ ...d, ...p }));
  }
  toggle(code: string, on: boolean): void {
    this.draft.update((d) => ({ ...d, factions: on ? [...d.factions, code] : d.factions.filter((f) => f !== code) }));
  }
}
