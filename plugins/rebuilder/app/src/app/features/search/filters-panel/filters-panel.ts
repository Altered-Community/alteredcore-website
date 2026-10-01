import { Component, computed, input, model, output, signal } from '@angular/core';
import { COST_RELATIONS, TYPE_OPTIONS, rarityOptionsFor, newEffectBlock, parseCostExpression, promoSetsOf, setsFor, type CardSource, type EffectBlock, type SearchFilters } from '../../../core/card-filters';
import { PROMO_SETS, SUBTYPES, termLabel } from '../../../core/card-vocabulary';
import { formatInfo } from '../../../core/formats';
import type { DeckFormat } from '../../../core/models';
import { ArButton } from '../../../ui/buttons';
import { effectTitle } from '../effect-editor/effect-editor.overlay';
import { ArChip, ArIconToggleGroup, ArLogicDivider } from '../../../ui/chips';
import { ArFilterSection } from '../../../ui/containers';
import { ArCombobox, ArInput, ArSegmented, ArSelect, type ComboOption } from '../../../ui/fields';
import { ArIcon } from '../../../ui/icon';
import { ArEffectSummary, ArExtensionTile, FACTIONS } from '../../../ui/metier';

/** Filter controls shared by the desktop aside and the mobile « Filtres » sheet. */
@Component({
  selector: 'app-filters-panel',
  imports: [ArInput, ArSelect, ArCombobox, ArFilterSection, ArExtensionTile, ArIconToggleGroup, ArChip, ArSegmented, ArEffectSummary, ArLogicDivider, ArButton, ArIcon],
  host: { '[class.sheet]': "mode() === 'sheet'" },
  templateUrl: './filters-panel.html',
  styleUrl: './filters-panel.scss',
})
export class FiltersPanel {
  readonly source = input<CardSource>('all');
  readonly mode = input<'aside' | 'sheet'>('aside');
  /** Editor: the deck's format, for the « légales » filter of Favoris. */
  readonly format = input<DeckFormat | null>(null);
  /** Card browser only: the editor locks the faction to the hero's. */
  readonly factionFilter = input(false);
  readonly value = model.required<SearchFilters>();
  readonly editEffect = output<number>();

  protected readonly rarities = computed(() => rarityOptionsFor(this.source()).map((r) => ({ value: r.value, icon: r.icon, label: r.label, short: r.short })));
  protected readonly legalLabel = computed(() => $localize`:@@search.filters.legalOnly:Légales en ${formatInfo(this.format()).label}:format:`);
  protected readonly types = TYPE_OPTIONS;
  protected readonly factions = FACTIONS;
  protected readonly environments = [
    { value: 'all' as const, label: $localize`:@@search.filters.allUniques:Toutes les Uniques` },
    { value: 'frontier' as const, label: 'Frontier' },
  ];
  protected readonly labels = {
    none: $localize`:@@search.filters.none:Aucune`,
    all: $localize`:@@search.filters.all:Toutes`,
  };
  protected readonly sets = computed(() => setsFor(this.source()));
  protected readonly allSets = computed(() => this.sets().map((s) => s.reference));
  protected readonly setsOpen = signal(false);
  protected readonly advancedOpen = signal(false);
  protected readonly mainInvalid = computed(() => parseCostExpression(this.value().mainCost) === null);
  protected readonly recallInvalid = computed(() => parseCostExpression(this.value().recallCost) === null);
  protected readonly powerInvalid = computed(() => {
    const v = this.value();
    return { forest: parseCostExpression(v.forestPower) === null, mountain: parseCostExpression(v.mountainPower) === null, ocean: parseCostExpression(v.oceanPower) === null };
  });
  protected readonly costRelations = COST_RELATIONS;
  protected readonly subtypeOptions: ComboOption[] = SUBTYPES.map((k, id) => ({ id, text: termLabel(k) }));
  /** Promo editions of the chosen sets. */
  protected readonly promoOptions = computed(() =>
    PROMO_SETS.filter((p) => this.value().sets.includes(p.parent)).map((p) => ({ code: p.code, label: termLabel(p) })),
  );

  protected picked(codes: string[]): ComboOption[] {
    return codes.map((c) => this.subtypeOptions[SUBTYPES.findIndex((t) => t.code === c)]).filter((o): o is ComboOption => !!o);
  }

  protected codes(values: ComboOption[]): string[] {
    return values.map((v) => SUBTYPES[v.id]?.code).filter((c): c is string => !!c);
  }

  /** « Alt arts » on: every printing and the promo editions of the chosen sets (as on the site); off: back to standard. */
  protected setAltArts(on: boolean): void {
    this.set({ altArts: on, promoSets: on ? promoSetsOf(this.value().sets) : [] });
  }

  protected togglePromo(code: string, on: boolean): void {
    const cur = this.value().promoSets.filter((p) => p !== code);
    this.set({ promoSets: on ? [...cur, code] : cur });
  }

  protected effectTitle(index: number): string {
    return effectTitle(index);
  }

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

  toggleOtherFaction(code: string, on: boolean): void {
    const cur = this.value().otherFactions.filter((f) => f !== code);
    this.set({ otherFactions: on ? [...cur, code] : cur });
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
