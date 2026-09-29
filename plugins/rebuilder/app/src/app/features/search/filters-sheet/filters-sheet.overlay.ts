import { Component, inject, signal } from '@angular/core';
import { defaultFilters, type CardSource, type SearchFilters } from '../../../core/card-filters';
import { AcButton } from '../../../ui/buttons';
import { AcOverlayRef, AcOverlayService } from '../../../ui/overlay';
import { openEffectEditorStep } from '../effect-editor/effect-editor.overlay';
import { FiltersPanel } from '../filters-panel/filters-panel';

export interface FiltersSheetData {
  source: CardSource;
  faction: string | null;
  filters: SearchFilters;
  factionFilter?: boolean;
}

const SOURCE_LABEL: Record<CardSource, string> = {
  all: 'Toutes les cartes',
  uniques: 'Uniques',
  owned: 'Propriété numérique',
  favorites: 'Favoris',
};

/** Mobile « Filtres » sheet: edits a draft and applies it when the user searches. */
@Component({
  selector: 'app-filters-sheet',
  imports: [FiltersPanel, AcButton],
  host: { class: 'ac-overlay-content' },
  templateUrl: './filters-sheet.overlay.html',
})
export class FiltersSheetOverlay {
  protected readonly ref = inject<AcOverlayRef<SearchFilters, FiltersSheetData>>(AcOverlayRef);
  protected readonly draft = signal<SearchFilters>(this.ref.data.filters);

  constructor() {
    this.ref.title.set('Filtres');
    this.ref.subtitle.set(SOURCE_LABEL[this.ref.data.source]);
    this.ref.headerAction.set({ label: 'Réinitialiser', run: () => this.draft.set(defaultFilters(this.ref.data.source)) });
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

export function openFiltersSheet(overlay: AcOverlayService, data: FiltersSheetData) {
  return overlay.open<FiltersSheetOverlay, SearchFilters, FiltersSheetData>(FiltersSheetOverlay, {
    title: 'Filtres',
    data,
    width: 560,
    sheetHeight: 'full',
  });
}
