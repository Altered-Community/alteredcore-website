import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { type Observable, of, switchMap, timer } from 'rxjs';
import { AcButton } from '../../../ui/buttons';
import { AcChip } from '../../../ui/chips';
import { type AcOption, type AcSegment, type AcSuggestion, AcAutocomplete, AcCheckbox, AcSegmented, AcSelect } from '../../../ui/fields';
import { FACTIONS } from '../../../ui/metier';
import { AcOverlayRef } from '../../../ui/overlay';
import { type Visibility, type DeckStatus, type DeckFilters, EMPTY_DECK_FILTERS } from '../deck-filters';

/** What the sheet closes with: the filters, and the card picked for the card filter (its name and picture). */
export type DeckFiltersResult = DeckFilters & { cardChoice: AcSuggestion | null };

/** Mobile filter sheet of the decks page (format, héros, visibilité, légalité, tournoi, carte, faction: what the tab supports). */
@Component({
  selector: 'app-deck-filters-sheet',
  imports: [AcSelect, AcSegmented, AcCheckbox, AcAutocomplete, AcChip, AcButton],
  host: { class: 'ac-overlay-content' },
  templateUrl: './deck-filters-sheet.html',
  styleUrl: './deck-filters-sheet.scss',
})
export class DeckFiltersSheet {
  protected readonly ref = inject<
    AcOverlayRef<
      DeckFiltersResult,
      {
        filters: DeckFilters;
        formats: { value: string; label: string }[];
        heroes: AcOption[];
        /** Hero options for the factions chosen in the sheet. */
        heroesFor?: (factions: string[]) => AcOption[];
        /** A faction change clears the hero (contest tab, as on the site). */
        clearHeroOnFaction?: boolean;
        visibilities: AcSegment<Visibility>[];
        /** « Actifs | Archivés » (shown with the visibility, « Mes decks »). */
        statuses?: AcSegment<DeckStatus>[];
        showFormat: boolean;
        showHero: boolean;
        showVisibility: boolean;
        /** « Légaux uniquement » (community tab). */
        showLegalOnly?: boolean;
        /** « Joués en tournoi » and the card filter (community tab). */
        showCommunity?: boolean;
        cardChoice?: AcSuggestion | null;
        suggestCards?: (q: string) => Observable<AcSuggestion[]>;
      }
    >
  >(AcOverlayRef);
  protected readonly draft = signal<DeckFilters>(this.ref.data.filters);
  protected readonly heroes = computed(() => this.ref.data.heroesFor?.(this.draft().factions) ?? this.ref.data.heroes);
  protected readonly factions = FACTIONS;
  protected readonly empty = EMPTY_DECK_FILTERS;
  protected readonly cardChoice = signal<AcSuggestion | null>(this.ref.data.cardChoice ?? null);
  private readonly cardQuery = signal('');
  private readonly cardSuggestRes = rxResource({
    params: () => (this.cardQuery().trim().length >= 2 && this.ref.data.suggestCards ? this.cardQuery().trim() : undefined),
    stream: ({ params }) => timer(250).pipe(switchMap(() => this.ref.data.suggestCards?.(params) ?? of([]))),
  });
  protected readonly cardOptions = linkedSignal<AcSuggestion[] | undefined, AcSuggestion[]>({
    source: () => (this.cardSuggestRes.hasValue() ? this.cardSuggestRes.value() : undefined),
    computation: (options, prev) => options ?? prev?.value ?? [],
  });
  protected readonly cardSuggesting = computed(() => this.cardSuggestRes.isLoading());

  protected onCardQuery(q: string): void {
    this.cardQuery.set(q);
  }

  protected setCard(choice: AcSuggestion | null): void {
    this.cardChoice.set(choice);
    this.patch({ card: choice?.value ?? '' });
  }

  protected reset(): void {
    this.draft.set(this.empty);
    this.cardChoice.set(null);
  }

  protected apply(): void {
    this.ref.close({ ...this.draft(), cardChoice: this.cardChoice() });
  }

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
