import { Component, computed, inject, signal } from '@angular/core';
import { defaultFilters, effectAt, hasInvalidNumericFilters, toSearchParams, withEditedEffect, type CardSource, type SearchFilters } from '../../../core/card-filters';
import type { DeckFormat } from '../../../core/models';
import type { EffectSlot } from '../../../core/uniques-api.service';
import { AcButton } from '../../../ui/buttons';
import { AcOverlayRef, AcOverlayService } from '../../../ui/overlay';
import { openEffectEditorStep } from '../effect-editor/effect-editor.overlay';
import { FiltersPanel } from '../filters-panel/filters-panel';

export interface FiltersSheetData {
  source: CardSource;
  faction: string | null;
  format?: DeckFormat | null;
  filters: SearchFilters;
  factionFilter?: boolean;
}

const SOURCE_LABEL: Record<CardSource, string> = {
  all: $localize`:@@search.source.all:Toutes les cartes`,
  collection: $localize`:@@search.source.collection:Collection physique`,
  owned: $localize`:@@search.source.owned:Propriété numérique`,
  favorites: $localize`:@@search.source.favorites:Favoris`,
};

const FILTERS_TITLE = $localize`:@@search.card.filters:Filtres`;

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
  protected readonly canApply = computed(() => !hasInvalidNumericFilters(this.draft(), this.ref.data.source));

  constructor() {
    this.ref.title.set(FILTERS_TITLE);
    this.ref.subtitle.set(SOURCE_LABEL[this.ref.data.source]);
    this.ref.headerAction.set({ label: $localize`:@@search.card.reset:Réinitialiser`, run: () => this.draft.set(defaultFilters(this.ref.data.source)) });
  }

  editEffect(index: EffectSlot): void {
    const effect = effectAt(this.draft(), index);
    if (!effect) return;
    openEffectEditorStep(this.ref, { effect, index, query: toSearchParams(this.draft(), this.ref.data.faction, 1, 1) }).afterClosed.subscribe((next) =>
      this.draft.set(withEditedEffect(this.draft(), index, next)),
    );
  }

  apply(): void {
    if (!this.canApply()) return;
    this.ref.close(this.draft());
  }
}

export function openFiltersSheet(overlay: AcOverlayService, data: FiltersSheetData) {
  return overlay.open<FiltersSheetOverlay, SearchFilters, FiltersSheetData>(FiltersSheetOverlay, {
    title: FILTERS_TITLE,
    data,
    width: 560,
    sheetHeight: 'full',
  });
}
