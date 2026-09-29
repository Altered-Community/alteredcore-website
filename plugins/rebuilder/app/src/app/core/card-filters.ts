import type { CardOrder, CardSearchParams } from './models';
import type { UniquesQuery } from './uniques-api.service';
import { assetUrl } from './asset-url';
import { contentLocale } from './locale';

export type CardSource = 'all' | 'uniques' | 'owned' | 'favorites';

export interface AbilityRef {
  id: number;
  text: string;
  /** `alteredicons` glyph printed before the text ({H} main, {R} réserve, {J} partout). */
  glyph?: string;
}

export interface EffectBlock {
  id: string;
  triggers: AbilityRef[];
  conditions: AbilityRef[];
  effects: AbilityRef[];
}

export interface SearchFilters {
  q: string;
  mainCost: string;
  recallCost: string;
  sets: string[];
  rarities: string[];
  types: string[];
  /** Only on the card browser: the editor locks the faction to the hero's. */
  factions: string[];
  environment: 'all' | 'frontier';
  effects: EffectBlock[];
  order: CardOrder;
  /** Recherche avancée. */
  noEffect: boolean;
  echo: boolean;
}

export interface SetInfo {
  reference: string;
  name: string;
}

/** Set names (French source, translated), newest first (Altered Re:Union naming). */
export const CARD_SETS: readonly SetInfo[] = [
  { reference: 'FUGUE', name: $localize`:@@search.filters.set.fugue:La Traversée Éternelle` },
  { reference: 'EOLE', name: $localize`:@@search.filters.set.eole:Les Racines de la Corruption` },
  { reference: 'DUSTER', name: $localize`:@@search.filters.set.duster:Les Graines de l’Unité` },
  { reference: 'CYCLONE', name: $localize`:@@search.filters.set.cyclone:Odyssée des cieux` },
  { reference: 'BISE', name: $localize`:@@search.filters.set.bise:Murmures du Labyrinthe` },
  { reference: 'ALIZE', name: $localize`:@@search.filters.set.alize:Épreuve du Froid` },
  { reference: 'COREKS', name: $localize`:@@search.filters.set.coreks:Au-delà des portes – KS` },
  { reference: 'CORE', name: $localize`:@@search.filters.set.core:Au-delà des portes` },
];

export const ALL_CARDS_SETS = ['FUGUE', 'EOLE', 'DUSTER', 'CYCLONE', 'BISE', 'ALIZE', 'CORE'];
export const UNIQUES_SETS = ['EOLE', 'DUSTER', 'CYCLONE', 'BISE', 'ALIZE', 'COREKS', 'CORE'];

export const RARITY_OPTIONS = [
  { value: 'COMMON', short: 'C', label: $localize`:@@search.filters.rarity.common:Commune`, icon: assetUrl('assets/icons/rarete-commune.png') },
  { value: 'RARE', short: 'R', label: $localize`:@@search.filters.rarity.rare:Rare`, icon: assetUrl('assets/icons/rarete-rare.png') },
  { value: 'EXALTED', short: 'E', label: $localize`:@@search.filters.rarity.exalted:Exaltée`, icon: assetUrl('assets/icons/rarete-exaltee.png') },
] as const;

export const TYPE_OPTIONS = [
  { value: 'CHARACTER', label: $localize`:@@search.filters.type.character:Personnage` },
  { value: 'SPELL', label: $localize`:@@search.filters.type.spell:Sort` },
  { value: 'LANDMARK_PERMANENT', label: $localize`:@@search.filters.type.landmark:Repère Permanent` },
  { value: 'EXPEDITION_PERMANENT', label: $localize`:@@search.filters.type.expedition:Permanent d’Expédition` },
  { value: 'TOKEN_MANA', label: $localize`:@@search.filters.type.mana:Mana` },
] as const;

export const FACTION_OPTIONS = [
  { code: 'AX', name: 'Axiom' },
  { code: 'BR', name: 'Bravos' },
  { code: 'LY', name: 'Lyra' },
  { code: 'MU', name: 'Muna' },
  { code: 'OR', name: 'Ordis' },
  { code: 'YZ', name: 'Yzmir' },
] as const;

export const ORDER_OPTIONS: { value: CardOrder; label: string }[] = [
  { value: 'setDate-desc', label: $localize`:@@search.filters.order.setDateDesc:Date set ↓` },
  { value: 'setDate-asc', label: $localize`:@@search.filters.order.setDateAsc:Date set ↑` },
  { value: 'number-asc', label: $localize`:@@search.filters.order.number:Numéro` },
];

export function defaultFilters(source: CardSource): SearchFilters {
  return {
    q: '',
    mainCost: '',
    recallCost: '',
    sets: source === 'uniques' ? [...UNIQUES_SETS] : ALL_CARDS_SETS.filter((s) => s !== 'FUGUE'),
    rarities: source === 'uniques' ? [] : RARITY_OPTIONS.map((r) => r.value),
    types: source === 'uniques' ? [] : TYPE_OPTIONS.slice(0, 4).map((t) => t.value),
    factions: [],
    environment: 'all',
    effects: [],
    order: 'setDate-desc',
    noEffect: false,
    echo: false,
  };
}

export function setsFor(source: CardSource): SetInfo[] {
  const refs = source === 'uniques' ? UNIQUES_SETS : ALL_CARDS_SETS;
  return CARD_SETS.filter((s) => refs.includes(s.reference));
}

const MAX_COST = 12;

/**
 * Parses "3", "1-3", "4+" and comma lists into the explicit values the cards API
 * accepts as `mainCost[]` / `recallCost[]` (it rejects range strings with a 500).
 * Returns null when the expression is invalid, [] when empty.
 */
export function parseCostExpression(expr: string): number[] | null {
  const trimmed = expr.trim();
  if (!trimmed) return [];
  const values = new Set<number>();
  for (const raw of trimmed.split(/[,;\s]+/).filter(Boolean)) {
    let m: RegExpExecArray | null;
    if ((m = /^(\d{1,2})$/.exec(raw))) {
      values.add(Number(m[1]));
    } else if ((m = /^(\d{1,2})\s*-\s*(\d{1,2})$/.exec(raw))) {
      const [a, b] = [Number(m[1]), Number(m[2])].sort((x, y) => x - y);
      for (let v = a; v <= b; v++) values.add(v);
    } else if ((m = /^(\d{1,2})\+$/.exec(raw))) {
      for (let v = Number(m[1]); v <= MAX_COST; v++) values.add(v);
    } else {
      return null;
    }
  }
  return [...values].sort((x, y) => x - y);
}

/**
 * Uniques tab (Uniques search API). Effect blocks read « Quand … ou … / Si … / Alors … ou … »:
 * values inside a criterion are OR-ed, blocks are AND-ed, as the API matches them. An exact
 * reference (`ALT_…`) looks up that card only.
 */
export function toUniquesQuery(filters: SearchFilters, faction: string | null): UniquesQuery {
  const q = filters.q.trim();
  const reference = /^ALT_[A-Z0-9_]+$/i.test(q) ? q.toUpperCase() : undefined;
  return {
    name: reference ? undefined : q || undefined,
    reference,
    factions: faction ? [faction] : filters.factions,
    sets: filters.sets,
    mainCosts: parseCostExpression(filters.mainCost) ?? [],
    recallCosts: parseCostExpression(filters.recallCost) ?? [],
    format: filters.environment === 'frontier' ? 'frontier' : undefined,
    effects: filters.effects.map((b) => ({
      triggers: b.triggers.map((x) => x.id),
      conditions: b.conditions.map((x) => x.id),
      effects: b.effects.map((x) => x.id),
    })),
  };
}

/** Other tabs (cards API). */
export function toSearchParams(
  filters: SearchFilters,
  faction: string | null,
  page: number,
  itemsPerPage: number,
): CardSearchParams {
  return {
    page,
    itemsPerPage,
    locale: contentLocale(),
    q: filters.q.trim() || undefined,
    factions: faction ? [faction] : filters.factions,
    sets: filters.sets,
    // Uniques live in their own tab: an empty rarity selection means C · R · E here.
    rarities: filters.rarities.length ? filters.rarities : RARITY_OPTIONS.map((r) => r.value),
    types: filters.types,
    variations: ['standard'],
    mainCosts: parseCostExpression(filters.mainCost) ?? [],
    recallCosts: parseCostExpression(filters.recallCost) ?? [],
    order: filters.order,
    hasNoEffect: filters.noEffect || undefined,
    hasEchoEffect: filters.echo || undefined,
  };
}

export interface FilterChip {
  id: string;
  label: string;
}

export function filterChips(filters: SearchFilters, source: CardSource): FilterChip[] {
  const chips: FilterChip[] = [];
  if (filters.q.trim()) chips.push({ id: 'q', label: $localize`:@@search.filters.chip.query:« ${filters.q.trim()}:query: »` });
  if (filters.factions.length) {
    chips.push({
      id: 'factions',
      label: filters.factions.length === 1 ? FACTION_OPTIONS.find((f) => f.code === filters.factions[0])?.name ?? $localize`:@@search.filters.chip.oneFaction:1 faction` : $localize`:@@search.filters.chip.factions:${filters.factions.length}:count: factions`,
    });
  }
  if (filters.sets.length) chips.push({ id: 'sets', label: filters.sets.length === 1 ? $localize`:@@search.filters.chip.oneSet:1 extension` : $localize`:@@search.filters.chip.sets:${filters.sets.length}:count: extensions` });
  if (source !== 'uniques' && filters.rarities.length) {
    chips.push({
      id: 'rarities',
      label: RARITY_OPTIONS.filter((r) => filters.rarities.includes(r.value)).map((r) => r.short).join(' · '),
    });
  }
  if (source !== 'uniques' && filters.types.length) {
    chips.push({ id: 'types', label: filters.types.length === 1 ? TYPE_OPTIONS.find((t) => t.value === filters.types[0])?.label ?? $localize`:@@search.filters.chip.oneType:1 type` : $localize`:@@search.filters.chip.types:${filters.types.length}:count: types` });
  }
  if (filters.mainCost.trim()) chips.push({ id: 'mainCost', label: $localize`:@@search.filters.chip.mainCost:Coût main : ${filters.mainCost.trim()}:cost:` });
  if (filters.recallCost.trim()) chips.push({ id: 'recallCost', label: $localize`:@@search.filters.chip.recallCost:Réserve : ${filters.recallCost.trim()}:cost:` });
  if (filters.noEffect) chips.push({ id: 'noEffect', label: $localize`:@@search.filters.chip.noEffect:Sans effet` });
  if (filters.echo) chips.push({ id: 'echo', label: $localize`:@@search.filters.chip.echo:Effet d’écho` });
  if (source === 'uniques') {
    chips.push({ id: 'environment', label: filters.environment === 'frontier' ? 'Frontier' : $localize`:@@search.filters.chip.allUniques:Toutes` });
    const n = filters.effects.filter((b) => b.triggers.length || b.conditions.length || b.effects.length).length;
    if (n) chips.push({ id: 'effects', label: n === 1 ? $localize`:@@search.filters.chip.oneEffect:1 effet` : $localize`:@@search.filters.chip.effects:${n}:count: effets` });
  }
  return chips;
}

export function removeChip(filters: SearchFilters, id: string): SearchFilters {
  switch (id) {
    case 'q':
      return { ...filters, q: '' };
    case 'sets':
      return { ...filters, sets: [] };
    case 'rarities':
      return { ...filters, rarities: [] };
    case 'types':
      return { ...filters, types: [] };
    case 'factions':
      return { ...filters, factions: [] };
    case 'mainCost':
      return { ...filters, mainCost: '' };
    case 'recallCost':
      return { ...filters, recallCost: '' };
    case 'environment':
      return { ...filters, environment: 'all' };
    case 'effects':
      return { ...filters, effects: [] };
    case 'noEffect':
      return { ...filters, noEffect: false };
    case 'echo':
      return { ...filters, echo: false };
    default:
      return filters;
  }
}

/** Filters that differ from an empty search, shown as the count badge on the filters button. */
export function activeFilterCount(filters: SearchFilters, source: CardSource): number {
  return filterChips(filters, source).filter((c) => c.id !== 'environment' || filters.environment !== 'all').length;
}

export function newEffectBlock(): EffectBlock {
  return { id: `fx-${Math.random().toString(36).slice(2, 9)}`, triggers: [], conditions: [], effects: [] };
}
