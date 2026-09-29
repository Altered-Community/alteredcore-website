import { Component, inject, signal } from '@angular/core';
import { defaultFilters, type CardSource, type SearchFilters } from '../../../core/card-filters';
import { ArButton } from '../../../ui/buttons';
import { ArOverlayRef, ArOverlayService } from '../../../ui/overlay';
import { openEffectEditorStep } from '../effect-editor/effect-editor.overlay';
import { FiltersPanel } from '../filters-panel/filters-panel';

export interface FiltersSheetData {
  source: CardSource;
  faction: string | null;
  filters: SearchFilters;
  factionFilter?: boolean;
}

const SOURCE_LABEL: Record<CardSource, string> = {
  all: $localize`:@@search.source.all:Toutes les cartes`,
  uniques: $localize`:@@search.source.uniques:Uniques`,
  owned: $localize`:@@search.source.owned:Propriété numérique`,
  favorites: $localize`:@@search.source.favorites:Favoris`,
};

const FILTERS_TITLE = $localize`:@@search.card.filters:Filtres`;

/** Mobile « Filtres » sheet: edits a draft and applies it when the user searches. */
@Component({
  selector: 'app-filters-sheet',
  imports: [FiltersPanel, ArButton],
  host: { class: 'ar-overlay-content' },
  templateUrl: './filters-sheet.overlay.html',
})
export class FiltersSheetOverlay {
  protected readonly ref = inject<ArOverlayRef<SearchFilters, FiltersSheetData>>(ArOverlayRef);
  protected readonly draft = signal<SearchFilters>(this.ref.data.filters);

  constructor() {
    this.ref.title.set(FILTERS_TITLE);
    this.ref.subtitle.set(SOURCE_LABEL[this.ref.data.source]);
    this.ref.headerAction.set({ label: $localize`:@@search.card.reset:Réinitialiser`, run: () => this.draft.set(defaultFilters(this.ref.data.source)) });
  }

  editEffect(index: number): void {
    const effect = this.draft().effects[index];
    if (!effect) return;
    openEffectEditorStep(this.ref, { effect, index }).afterClosed.subscribe((next) => {
      if (!next) return;
      this.draft.update((d) => ({ ...d, effects: d.effects.map((e, i) => (i === index ? next : e)) }));
    });
  }

  apply(): void {
    this.ref.close(this.draft());
  }
}

export function openFiltersSheet(overlay: ArOverlayService, data: FiltersSheetData) {
  return overlay.open<FiltersSheetOverlay, SearchFilters, FiltersSheetData>(FiltersSheetOverlay, {
    title: FILTERS_TITLE,
    data,
    width: 560,
    sheetHeight: 'full',
  });
}
