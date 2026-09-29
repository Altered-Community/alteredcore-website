import { Component, computed, inject, signal } from '@angular/core';
import { ArButton } from '../../../ui/buttons';
import { ArChip } from '../../../ui/chips';
import { ArSegmented, ArSelect } from '../../../ui/fields';
import { FACTIONS } from '../../../ui/metier';
import { ArOverlayRef } from '../../../ui/overlay';
import { type Visibility, type DeckFilters, EMPTY_DECK_FILTERS } from '../deck-filters';

/** Mobile filter sheet of the decks page (format, héros, visibilité, faction: what the tab supports). */
@Component({
  selector: 'app-deck-filters-sheet',
  imports: [ArSelect, ArSegmented, ArChip, ArButton],
  host: { class: 'ar-overlay-content' },
  templateUrl: './deck-filters-sheet.html',
  styleUrl: './deck-filters-sheet.scss',
})
export class DeckFiltersSheet {
  protected readonly ref = inject<
    ArOverlayRef<
      DeckFilters,
      {
        filters: DeckFilters;
        formats: { value: string; label: string }[];
        heroes: { value: string; label: string }[];
        /** Hero options for the factions chosen in the sheet (contest tab). */
        heroesFor?: (factions: string[]) => { value: string; label: string }[];
        /** A faction change clears the hero (contest tab, as on the site). */
        clearHeroOnFaction?: boolean;
        visibilities: { value: Visibility; label: string }[];
        showFormat: boolean;
        showHero: boolean;
        showVisibility: boolean;
      }
    >
  >(ArOverlayRef);
  protected readonly draft = signal<DeckFilters>(this.ref.data.filters);
  protected readonly heroes = computed(() => this.ref.data.heroesFor?.(this.draft().factions) ?? this.ref.data.heroes);
  protected readonly factions = FACTIONS;
  protected readonly empty = EMPTY_DECK_FILTERS;
  patch(p: Partial<DeckFilters>): void {
    this.draft.update((d) => ({ ...d, ...p }));
  }
  toggle(code: string, on: boolean): void {
    const hero = this.ref.data.clearHeroOnFaction ? '' : this.draft().hero;
    this.draft.update((d) => ({ ...d, hero, factions: on ? [...d.factions, code] : d.factions.filter((f) => f !== code) }));
  }
}
