import type { CardOrder, CardSearchParams } from './models';
import type { UniquesQuery } from './uniques-api.service';
import { assetUrl } from './asset-url';
import { contentLocale } from './locale';
import { PROMO_SETS, SUBTYPES, VARIATIONS, termLabel } from './card-vocabulary';

export type CardSource = 'all' | 'uniques' | 'collection' | 'owned' | 'favorites';

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
  /** Biome powers, same syntax as the costs (« 3 », « 1-3 », « 4+ », « <4 »…). */
  forestPower: string;
  mountainPower: string;
  oceanPower: string;
  /**
   * Subtypes (any of them). No keyword or echo filter: the cards API has almost no keyword on the cards and marks the
   * echo effect on Uniques only (checked 2026-09-30, see docs/api-limitations/cards-api.md).
   */
  subtypes: string[];
  costRelation: CostRelation;
  /** « Alt arts »: every printing, and the promo editions of the chosen sets (`promoSets`). */
  altArts: boolean;
  promoSets: string[];
  /** Favoris in the editor: only the cards the deck's format allows (`allowedInFormat`). */
  legalOnly: boolean;
  /** Editor: « Changer de faction », searched instead of the hero's faction. */
  otherFactions: string[];
}

/** Main cost against reserve cost (`costRelation` of the cards API). */
export type CostRelation = '' | 'equal' | 'mainHigher' | 'recallHigher';

export const COST_RELATIONS: { value: CostRelation; label: string }[] = [
  { value: '', label: $localize`:@@search.filters.costRelation.any:Gestion des coûts` },
  { value: 'equal', label: $localize`:@@search.filters.costRelation.equal:Coût main = réserve` },
  { value: 'mainHigher', label: $localize`:@@search.filters.costRelation.mainHigher:Coût main plus élevé` },
  { value: 'recallHigher', label: $localize`:@@search.filters.costRelation.recallHigher:Coût réserve plus élevé` },
];

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

export const ALL_CARDS_SETS = ['FUGUE', 'EOLE', 'DUSTER', 'CYCLONE', 'BISE', 'ALIZE', 'COREKS', 'CORE'];
export const UNIQUES_SETS = ['EOLE', 'DUSTER', 'CYCLONE', 'BISE', 'ALIZE', 'COREKS', 'CORE'];
/**
 * Offered but left out by default: the set not on BGA yet (FUGUE), and the Kickstarter edition (COREKS) except where
 * Uniques are listed (Uniques, Favoris, Propriété numérique).
 */
function setsOffByDefault(source: CardSource): string[] {
  return source === 'uniques' || listsUniques(source) ? ['FUGUE'] : ['FUGUE', 'COREKS'];
}

export const RARITY_OPTIONS = [
  { value: 'COMMON', short: 'C', label: $localize`:@@search.filters.rarity.common:Commune`, icon: assetUrl('assets/icons/rarete-commune.png') },
  { value: 'RARE', short: 'R', label: $localize`:@@search.filters.rarity.rare:Rare`, icon: assetUrl('assets/icons/rarete-rare.png') },
  { value: 'EXALTED', short: 'E', label: $localize`:@@search.filters.rarity.exalted:Exaltée`, icon: assetUrl('assets/icons/rarete-exaltee.png') },
] as const;

/** The Favoris and Propriété numérique tabs also list the Uniques (favorites, digital Uniques owned). */
export const UNIQUE_RARITY = { value: 'UNIQUE', short: 'U', label: $localize`:@@search.filters.rarity.unique:Unique`, icon: assetUrl('assets/icons/rarete-unique.png') };

export function rarityOptionsFor(source: CardSource): readonly { value: string; short: string; label: string; icon: string }[] {
  return listsUniques(source) ? [...RARITY_OPTIONS, UNIQUE_RARITY] : RARITY_OPTIONS;
}

/** Account lists holding Uniques among the other cards: their « légales » filter leaves them out in a No Unique format. */
export function listsUniques(source: CardSource): source is 'favorites' | 'owned' {
  return source === 'favorites' || source === 'owned';
}

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

/**
 * Sorts of `GET /api/cards`. Name and reference are left out: the API ignores `order[name.{locale}]` and
 * `order[reference]` (checked 2026-09-30, see docs/api-limitations/cards-api.md).
 */
export const ORDER_OPTIONS: { value: CardOrder; label: string }[] = [
  { value: 'setDate-desc', label: $localize`:@@search.filters.order.setDateDesc:Date set ↓` },
  { value: 'setDate-asc', label: $localize`:@@search.filters.order.setDateAsc:Date set ↑` },
  { value: 'number-asc', label: $localize`:@@search.filters.order.number:Numéro` },
  { value: 'collector-asc', label: $localize`:@@search.filters.order.collectorAsc:Collector N° ↑` },
  { value: 'collector-desc', label: $localize`:@@search.filters.order.collectorDesc:Collector N° ↓` },
  { value: 'mainCost-asc', label: $localize`:@@search.filters.order.mainAsc:Main ↑` },
  { value: 'mainCost-desc', label: $localize`:@@search.filters.order.mainDesc:Main ↓` },
  { value: 'recallCost-asc', label: $localize`:@@search.filters.order.reserveAsc:Réserve ↑` },
  { value: 'recallCost-desc', label: $localize`:@@search.filters.order.reserveDesc:Réserve ↓` },
  { value: 'forestPower-asc', label: $localize`:@@search.filters.order.forestAsc:Forêt ↑` },
  { value: 'forestPower-desc', label: $localize`:@@search.filters.order.forestDesc:Forêt ↓` },
  { value: 'mountainPower-asc', label: $localize`:@@search.filters.order.mountainAsc:Montagne ↑` },
  { value: 'mountainPower-desc', label: $localize`:@@search.filters.order.mountainDesc:Montagne ↓` },
  { value: 'oceanPower-asc', label: $localize`:@@search.filters.order.oceanAsc:Océan ↑` },
  { value: 'oceanPower-desc', label: $localize`:@@search.filters.order.oceanDesc:Océan ↓` },
  { value: 'random', label: $localize`:@@search.filters.order.random:Aléatoire` },
];

export function defaultFilters(source: CardSource): SearchFilters {
  return {
    q: '',
    mainCost: '',
    recallCost: '',
    sets: (source === 'uniques' ? UNIQUES_SETS : ALL_CARDS_SETS).filter((s) => !setsOffByDefault(source).includes(s)),
    rarities: source === 'uniques' ? [] : rarityOptionsFor(source).map((r) => r.value),
    types: source === 'uniques' ? [] : TYPE_OPTIONS.slice(0, 4).map((t) => t.value),
    factions: [],
    environment: 'all',
    effects: [],
    order: 'setDate-desc',
    noEffect: false,
    forestPower: '',
    mountainPower: '',
    oceanPower: '',
    subtypes: [],
    costRelation: '',
    altArts: false,
    promoSets: [],
    otherFactions: [],
    legalOnly: true,
  };
}

/** Promo editions of the chosen main sets (« Alt arts » turned on, as on the site). */
export function promoSetsOf(sets: readonly string[]): string[] {
  return PROMO_SETS.filter((p) => sets.includes(p.parent)).map((p) => p.code);
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
  const span = (a: number, b: number) => {
    for (let v = Math.max(0, a); v <= Math.min(MAX_COST, b); v++) values.add(v);
  };
  for (const raw of trimmed.split(/[,;\s]+/).filter(Boolean)) {
    let m: RegExpExecArray | null;
    if ((m = /^(\d{1,2})$/.exec(raw))) {
      values.add(Number(m[1]));
    } else if ((m = /^(\d{1,2})\s*-\s*(\d{1,2})$/.exec(raw))) {
      const [a, b] = [Number(m[1]), Number(m[2])].sort((x, y) => x - y);
      span(a, b);
    } else if ((m = /^(\d{1,2})\+$/.exec(raw))) {
      span(Number(m[1]), MAX_COST);
    } else if ((m = /^(\d{1,2})-$/.exec(raw))) {
      // « 4- »: 4 or less (the site's syntax).
      span(0, Number(m[1]));
    } else if ((m = /^(<=|>=|<|>)(\d{1,2})$/.exec(raw))) {
      // « <4 », « >2 », « <=4 », « >=2 » (the site's syntax).
      const n = Number(m[2]);
      if (m[1] === '<') span(0, n - 1);
      else if (m[1] === '<=') span(0, n);
      else if (m[1] === '>') span(n + 1, MAX_COST);
      else span(n, MAX_COST);
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
    // The editor searches the hero's faction, or the ones chosen in « Changer de faction ».
    factions: faction ? (filters.otherFactions.length ? filters.otherFactions : [faction]) : filters.factions,
    sets: filters.altArts ? [...filters.sets, ...filters.promoSets.filter((p) => !filters.sets.includes(p))] : filters.sets,
    // Uniques live in their own tab: an empty rarity selection means C · R · E here.
    rarities: filters.rarities.length ? filters.rarities : RARITY_OPTIONS.map((r) => r.value),
    types: filters.types,
    variations: filters.altArts ? VARIATIONS.map((v) => v.code) : ['standard'],
    mainCosts: parseCostExpression(filters.mainCost) ?? [],
    recallCosts: parseCostExpression(filters.recallCost) ?? [],
    forestPowers: parseCostExpression(filters.forestPower) ?? [],
    mountainPowers: parseCostExpression(filters.mountainPower) ?? [],
    oceanPowers: parseCostExpression(filters.oceanPower) ?? [],
    subtypes: filters.subtypes,
    costRelation: filters.costRelation || undefined,
    order: filters.order,
    hasNoEffect: filters.noEffect || undefined,
  };
}

export interface FilterChip {
  id: string;
  label: string;
}

/**
 * Filters the Favoris tab applies: the site's `favorites-search` filters its table by faction, rarity and set only.
 * The others are disabled there and give no chip.
 */
export const FAVORITES_FILTERS: ReadonlySet<string> = new Set(['factions', 'otherFactions', 'sets', 'rarities']);

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
      label: rarityOptionsFor(source).filter((r) => filters.rarities.includes(r.value)).map((r) => r.short).join(' · '),
    });
  }
  if (source !== 'uniques' && filters.types.length) {
    chips.push({ id: 'types', label: filters.types.length === 1 ? TYPE_OPTIONS.find((t) => t.value === filters.types[0])?.label ?? $localize`:@@search.filters.chip.oneType:1 type` : $localize`:@@search.filters.chip.types:${filters.types.length}:count: types` });
  }
  if (filters.mainCost.trim()) chips.push({ id: 'mainCost', label: $localize`:@@search.filters.chip.mainCost:Coût main : ${filters.mainCost.trim()}:cost:` });
  if (filters.recallCost.trim()) chips.push({ id: 'recallCost', label: $localize`:@@search.filters.chip.recallCost:Réserve : ${filters.recallCost.trim()}:cost:` });
  if (filters.noEffect) chips.push({ id: 'noEffect', label: $localize`:@@search.filters.chip.noEffect:Sans effet` });
  if (source !== 'uniques') {
    const power = (id: 'forestPower' | 'mountainPower' | 'oceanPower', label: string) => {
      if (filters[id].trim()) chips.push({ id, label: `${label} : ${filters[id].trim()}` });
    };
    power('forestPower', $localize`:@@ui.terrain.forest:Forêt`);
    power('mountainPower', $localize`:@@ui.terrain.mountain:Montagne`);
    power('oceanPower', $localize`:@@ui.terrain.ocean:Océan`);
    if (filters.subtypes.length) chips.push({ id: 'subtypes', label: filters.subtypes.length === 1 ? termLabel(SUBTYPES.find((k) => k.code === filters.subtypes[0]) ?? { code: '', fr: filters.subtypes[0], en: filters.subtypes[0] }) : $localize`:@@search.filters.chip.subtypes:${filters.subtypes.length}:count: sous-types` });
    if (filters.costRelation) chips.push({ id: 'costRelation', label: COST_RELATIONS.find((c) => c.value === filters.costRelation)?.label ?? '' });
    if (filters.altArts) chips.push({ id: 'altArts', label: $localize`:@@search.filters.chip.altArts:Alt arts` });
    if (filters.otherFactions.length) {
      chips.push({
        id: 'otherFactions',
        label: filters.otherFactions.map((c) => FACTION_OPTIONS.find((f) => f.code === c)?.name ?? c).join(' · '),
      });
    }
  }
  if (source === 'uniques') {
    chips.push({ id: 'environment', label: filters.environment === 'frontier' ? 'Frontier' : $localize`:@@search.filters.chip.allUniques:Toutes` });
    const n = filters.effects.filter((b) => b.triggers.length || b.conditions.length || b.effects.length).length;
    if (n) chips.push({ id: 'effects', label: n === 1 ? $localize`:@@search.filters.chip.oneEffect:1 effet` : $localize`:@@search.filters.chip.effects:${n}:count: effets` });
  }
  return source === 'favorites' ? chips.filter((c) => FAVORITES_FILTERS.has(c.id)) : chips;
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
    case 'forestPower':
    case 'mountainPower':
    case 'oceanPower':
      return { ...filters, [id]: '' };
    case 'subtypes':
      return { ...filters, subtypes: [] };
    case 'costRelation':
      return { ...filters, costRelation: '' };
    case 'altArts':
      return { ...filters, altArts: false, promoSets: [] };
    case 'otherFactions':
      return { ...filters, otherFactions: [] };
    default:
      return filters;
  }
}

/** Filters that differ from an empty search, shown as the count badge on the filters button. */
export function activeFilterCount(filters: SearchFilters, source: CardSource): number {
  return filterChips(filters, source).filter((c) => c.id !== 'environment' || filters.environment !== 'all').length;
}

export function newEffectId(): string {
  return `fx-${Math.random().toString(36).slice(2, 9)}`;
}

export function newEffectBlock(): EffectBlock {
  return { id: newEffectId(), triggers: [], conditions: [], effects: [] };
}
