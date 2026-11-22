import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { uiLocale } from '../../../core/i18n';
import { subtypeFacetParams } from '../../../core/subtype-facets';
import { SUPPORT_TITLE, ZERO_POWER_LABEL, emptySupport, hasEffectCriteria, isAccountSource, rarityOptionsFor, newEffectBlock, newEffectId, parseCostExpression, setsFor, supportsArtists, supportsTextSearch, supportsZeroPower, typeOptionsFor, type AltArtsMode, type CardSource, type EffectBlock, type SearchFilters } from '../../../core/card-filters';
import { UniquesApiService } from '../../../core/uniques-api.service';
import { PROMO_SETS, SUBTYPES, termLabel } from '../../../core/card-vocabulary';
import { formatInfo } from '../../../core/formats';
import { assetUrl } from '../../../core/asset-url';
import { ICONS } from '../../../core/card-text';
import type { DeckFormat } from '../../../core/models';
import type { EffectSlot } from '../../../core/uniques-api.service';
import { AcButton } from '../../../ui/buttons';
import { effectTitle } from '../effect-editor/effect-editor.overlay';
import { AcChip, AcIconToggleGroup, AcLogicDivider } from '../../../ui/chips';
import { AcFilterSection } from '../../../ui/containers';
import { AcCombobox, AcInput, AcSegmented, type ComboOption } from '../../../ui/fields';
import { AcIcon } from '../../../ui/icon';
import { AcEffectSummary, AcExtensionTile, FACTIONS } from '../../../ui/metier';

/** Filter controls shared by the desktop aside and the mobile « Filtres » sheet. */
@Component({
  selector: 'app-filters-panel',
  imports: [NgTemplateOutlet, AcInput, AcCombobox, AcFilterSection, AcExtensionTile, AcIconToggleGroup, AcChip, AcSegmented, AcEffectSummary, AcLogicDivider, AcButton, AcIcon],
  host: { '[class.sheet]': "mode() === 'sheet'" },
  templateUrl: './filters-panel.html',
  styleUrl: './filters-panel.scss',
})
export class FiltersPanel {
  private readonly uniquesApi = inject(UniquesApiService);
  readonly source = input<CardSource>('all');
  readonly mode = input<'aside' | 'sheet'>('aside');
  /** Editor: the deck's format, for the « légales » filter of the account tabs. */
  readonly format = input<DeckFormat | null>(null);
  /** Card browser only: the editor locks the faction to the hero's. */
  readonly factionFilter = input(false);
  /** Editor: the hero's faction the search is locked to (the subtypes offered are counted in it). */
  readonly faction = input<string | null>(null);
  readonly value = model.required<SearchFilters>();
  /** Opens the effect editor on a main effect (its index) or on the support effect. */
  readonly editEffect = output<EffectSlot>();
  protected readonly supportTitle = SUPPORT_TITLE;
  protected readonly emptySupport = emptySupport;
  protected readonly hasSupport = computed(() => hasEffectCriteria(this.value().support));

  protected readonly rarities = computed(() => rarityOptionsFor(this.source()).map((r) => ({ value: r.value, icon: r.icon, label: r.label, short: r.short })));
  protected readonly legalFilter = computed(() => isAccountSource(this.source()));
  protected readonly legalLabel = computed(() => $localize`:@@search.filters.legalOnly:Légales en ${formatInfo(this.format()).label}:format:`);
  /** Heroes, tokens and mana in the card browser too (`factionFilter`: the card browser). */
  protected readonly types = computed(() => typeOptionsFor(this.factionFilter()));
  protected readonly zeroPower = computed(() => supportsZeroPower(this.source()));
  protected readonly zeroPowerLabel = ZERO_POWER_LABEL;
  /** In the cost fields: the hand and reserve symbols (`alteredicons`, as the site's search). */
  protected readonly glyphs = { hand: ICONS['H'].glyph, reserve: ICONS['R'].glyph };
  /** In the power fields: the terrains. */
  protected readonly biomes = {
    forest: assetUrl('assets/biome/F.webp'),
    mountain: assetUrl('assets/biome/M.webp'),
    ocean: assetUrl('assets/biome/O.webp'),
  };
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
  /** Favoris: the site filters them by faction, set and rarity only (« légales », another faction in the editor); no other field. */
  protected readonly limited = computed(() => this.source() === 'favorites');
  protected readonly supportsCostAndEffect = computed(() => !isAccountSource(this.source()));
  protected readonly supportsAltArts = computed(() => this.source() === 'all' || this.source() === 'owned');
  /** Search in the card's text, under the name field. */
  protected readonly textSearch = computed(() => supportsTextSearch(this.source()));
  protected readonly altArtsModes: { value: AltArtsMode; label: string }[] = [
    { value: 'off', label: $localize`:@@search.filters.prints.standard:Standard` },
    { value: 'with', label: $localize`:@@search.filters.prints.with:Toutes` },
    { value: 'only', label: $localize`:@@search.filters.prints.only:Alt arts` },
  ];
  protected readonly allSets = computed(() => this.sets().map((s) => s.reference));
  protected readonly advancedOpen = signal(false);
  protected readonly mainInvalid = computed(() => parseCostExpression(this.value().mainCost) === null);
  protected readonly recallInvalid = computed(() => parseCostExpression(this.value().recallCost) === null);
  protected readonly powerInvalid = computed(() => {
    const v = this.value();
    return { forest: parseCostExpression(v.forestPower) === null, mountain: parseCostExpression(v.mountainPower) === null, ocean: parseCostExpression(v.oceanPower) === null };
  });
  /** Every subtype (`id`: index in `SUBTYPES`), as shown once picked: name alone. */
  protected readonly allSubtypes: ComboOption[] = SUBTYPES.map((k, id) => ({ id, text: termLabel(k) }));
  /**
   * Cards per subtype with the other filters (`/api/v2/search/facets`), « Toutes les cartes » and « Uniques »; `null`
   * elsewhere, while it loads the first time, or when the API cannot count. Asked again once the filters stay still.
   */
  private readonly facets = toSignal(
    toObservable(computed(() => subtypeFacetParams(this.source(), this.value(), this.faction()))).pipe(
      map((params) => ({ params, key: params?.toString() ?? '' })),
      distinctUntilChanged((a, b) => a.key === b.key),
      debounceTime(250),
      switchMap(({ params }) => (params ? this.uniquesApi.subtypeFacets(params) : of(null))),
    ),
    { initialValue: null },
  );
  /**
   * The subtypes offered: those still giving cards, with their count (« Mage · 10 »), and the ones picked (to untick
   * them, even at 0); every subtype when there is no count.
   */
  protected readonly subtypeOptions = computed<ComboOption[]>(() => {
    const facets = this.facets();
    if (!facets) return this.allSubtypes;
    const picked = new Set(this.value().subtypes);
    const fmt = new Intl.NumberFormat(uiLocale());
    return SUBTYPES.flatMap((k, id) => {
      const n = facets[k.code] ?? 0;
      if (!n && !picked.has(k.code)) return [];
      const text = `${termLabel(k)} · ${fmt.format(n)}`;
      // The same object while the count holds: the list (CDK listbox) keeps its checked options by reference.
      const key = `${id}|${text}`;
      let option = this.countedSubtypes.get(key);
      if (!option) this.countedSubtypes.set(key, (option = { id, text }));
      return [option];
    });
  });
  private readonly countedSubtypes = new Map<string, ComboOption>();
  /** Promo editions of the chosen sets (`id`: index in `PROMO_SETS`). */
  protected readonly promoOptions = computed<ComboOption[]>(() =>
    PROMO_SETS.flatMap((p, id) => (this.value().sets.includes(p.parent) ? [{ id, text: termLabel(p) }] : [])),
  );
  protected readonly pickedPromos = computed(() => this.promoOptions().filter((o) => this.value().promoSets.includes(PROMO_SETS[o.id].code)));
  /** Every artist of the catalog (empty until the search API lists them: no field). */
  private readonly artists = toSignal(this.uniquesApi.artists(), { initialValue: [] as string[] });
  protected readonly artistOptions = computed<ComboOption[]>(() => (supportsArtists(this.source()) ? this.artists().map((text, id) => ({ id, text })) : []));
  protected readonly pickedArtists = computed(() => this.artistOptions().filter((o) => this.value().artists.includes(o.text)));

  protected picked(codes: string[]): ComboOption[] {
    return codes.map((c) => this.allSubtypes[SUBTYPES.findIndex((t) => t.code === c)]).filter((o): o is ComboOption => !!o);
  }

  protected codes(values: ComboOption[]): string[] {
    return values.map((v) => SUBTYPES[v.id]?.code).filter((c): c is string => !!c);
  }

  protected artistNames(values: ComboOption[]): string[] {
    return values.map((v) => v.text);
  }

  /**
   * « Toutes » (every printing) or « Alt arts » (the alt arts alone): the promo editions of the chosen sets join the search
   * (as on the site), all of them until some are picked; « Standard »: back to the standard prints.
   */
  protected setAltArts(mode: AltArtsMode): void {
    this.set({ altArts: mode, promoSets: mode === 'off' ? [] : this.value().promoSets });
  }

  protected setPromos(values: ComboOption[]): void {
    this.set({ promoSets: values.map((v) => PROMO_SETS[v.id]?.code).filter((c): c is string => !!c) });
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

  /** A copy of effect `i` right after it, with its own id. */
  duplicateEffect(i: number): void {
    const effects = [...this.value().effects];
    effects.splice(i + 1, 0, { ...effects[i], id: newEffectId() });
    this.set({ effects });
  }

  removeEffect(i: number): void {
    this.set({ effects: this.value().effects.filter((_, idx) => idx !== i) });
  }
}
