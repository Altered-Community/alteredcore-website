import { Component, computed, inject, signal } from '@angular/core';
import { AcButton } from '../../../ui/buttons';
import { AcChip } from '../../../ui/chips';
import { type AcOption, AcCheckbox, AcSegmented, AcSelect } from '../../../ui/fields';
import { FACTIONS } from '../../../ui/metier';
import { AcOverlayRef } from '../../../ui/overlay';
import { type Visibility, type DeckFilters, EMPTY_DECK_FILTERS } from '../deck-filters';

/** Mobile filter sheet of the decks page (format, héros, visibilité, légalité, faction: what the tab supports). */
@Component({
  selector: 'app-deck-filters-sheet',
  imports: [AcSelect, AcSegmented, AcCheckbox, AcChip, AcButton],
  host: { class: 'ac-overlay-content' },
  templateUrl: './deck-filters-sheet.html',
  styleUrl: './deck-filters-sheet.scss',
})
export class DeckFiltersSheet {
  protected readonly ref = inject<
    AcOverlayRef<
      DeckFilters,
      {
        filters: DeckFilters;
        formats: { value: string; label: string }[];
        heroes: AcOption[];
        /** Hero options for the factions chosen in the sheet. */
        heroesFor?: (factions: string[]) => AcOption[];
        /** A faction change clears the hero (contest tab, as on the site). */
        clearHeroOnFaction?: boolean;
        visibilities: { value: Visibility; label: string }[];
        showFormat: boolean;
        showHero: boolean;
        showVisibility: boolean;
        /** « Légaux uniquement » (community tab). */
        showLegalOnly?: boolean;
      }
    >
  >(AcOverlayRef);
  protected readonly draft = signal<DeckFilters>(this.ref.data.filters);
  protected readonly heroes = computed(() => this.ref.data.heroesFor?.(this.draft().factions) ?? this.ref.data.heroes);
  protected readonly factions = FACTIONS;
  protected readonly empty = EMPTY_DECK_FILTERS;
  patch(p: Partial<DeckFilters>): void {
    this.draft.update((d) => ({ ...d, ...p }));
  }
  toggle(code: string, on: boolean): void {
    this.draft.update((d) => {
      const factions = on ? [...d.factions, code] : d.factions.filter((f) => f !== code);
      const offered = !d.hero || (this.ref.data.heroesFor?.(factions) ?? this.ref.data.heroes).some((o) => o.value === d.hero);
      return { ...d, hero: this.ref.data.clearHeroOnFaction || !offered ? '' : d.hero, factions };
    });
  }
}
