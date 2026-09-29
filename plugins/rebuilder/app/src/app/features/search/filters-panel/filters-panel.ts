import { Component, computed, input, model, output, signal } from '@angular/core';
import { RARITY_OPTIONS, TYPE_OPTIONS, newEffectBlock, parseCostExpression, setsFor, type CardSource, type EffectBlock, type SearchFilters } from '../../../core/card-filters';
import { ArButton } from '../../../ui/buttons';
import { ArChip, ArIconToggleGroup, ArLogicDivider } from '../../../ui/chips';
import { ArFilterSection } from '../../../ui/containers';
import { ArInput, ArSegmented } from '../../../ui/fields';
import { ArIcon } from '../../../ui/icon';
import { ArEffectSummary, ArExtensionTile, FACTIONS } from '../../../ui/metier';

/** Filter controls shared by the desktop aside and the mobile « Filtres » sheet. */
@Component({
  selector: 'app-filters-panel',
  imports: [ArInput, ArFilterSection, ArExtensionTile, ArIconToggleGroup, ArChip, ArSegmented, ArEffectSummary, ArLogicDivider, ArButton, ArIcon],
  host: { '[class.sheet]': "mode() === 'sheet'" },
  templateUrl: './filters-panel.html',
  styleUrl: './filters-panel.scss',
})
export class FiltersPanel {
  readonly source = input<CardSource>('all');
  readonly mode = input<'aside' | 'sheet'>('aside');
  /** Card browser only: the editor locks the faction to the hero's. */
  readonly factionFilter = input(false);
  readonly value = model.required<SearchFilters>();
  readonly editEffect = output<number>();

  protected readonly rarities = RARITY_OPTIONS.map((r) => ({ value: r.value, icon: r.icon, label: r.label, short: r.short }));
  protected readonly types = TYPE_OPTIONS;
  protected readonly factions = FACTIONS;
  protected readonly environments = [
    { value: 'all' as const, label: 'Toutes les Uniques' },
    { value: 'frontier' as const, label: 'Frontier' },
  ];
  protected readonly sets = computed(() => setsFor(this.source()));
  protected readonly allSets = computed(() => this.sets().map((s) => s.reference));
  protected readonly setsOpen = signal(false);
  protected readonly advancedOpen = signal(false);
  protected readonly mainInvalid = computed(() => parseCostExpression(this.value().mainCost) === null);
  protected readonly recallInvalid = computed(() => parseCostExpression(this.value().recallCost) === null);

  set(partial: Partial<SearchFilters>): void {
    this.value.set({ ...this.value(), ...partial });
  }

  toggleSet(ref: string, on: boolean): void {
    const cur = this.value().sets.filter((s) => s !== ref);
    this.set({ sets: on ? [...cur, ref] : cur });
  }

  toggleFaction(code: string, on: boolean): void {
    const cur = this.value().factions.filter((f) => f !== code);
    this.set({ factions: on ? [...cur, code] : cur });
  }

  toggleType(t: string, on: boolean): void {
    const cur = this.value().types.filter((x) => x !== t);
    this.set({ types: on ? [...cur, t] : cur });
  }

  addEffect(): void {
    const effects: EffectBlock[] = [...this.value().effects, newEffectBlock()];
    this.set({ effects });
    this.editEffect.emit(effects.length - 1);
  }

  removeEffect(i: number): void {
    this.set({ effects: this.value().effects.filter((_, idx) => idx !== i) });
  }
}
