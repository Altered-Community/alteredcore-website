import type { CardOrder, CardSearchParams, DeckFormat } from './models';
import type { EffectSlot, UniquesQuery } from './uniques-api.service';
import type { RichPart } from './card-text';
import { environment } from '../../environments/environment';
import { assetUrl } from './asset-url';
import { contentLocale } from './locale';
import type { OwnedSource } from './owned-cards.service';
import { PROMO_SETS, SUBTYPES, VARIATIONS, termLabel } from './card-vocabulary';

export type CardSource = 'all' | 'uniques' | 'collection' | 'owned' | 'favorites';

export interface AbilityRef {
  id: number;
  text: string;
  /** `alteredicons` glyph printed before the text ({H} main, {R} réserve, {J} partout). */
  glyph?: string;
  /** The text as the card prints it (`{D}` symbols, keywords in bold), when it has more than plain words; `text` is its plain reading. */
  rich?: RichPart[];
}

export interface EffectBlock {
  id: string;
  triggers: AbilityRef[];
  conditions: AbilityRef[];
  effects: AbilityRef[];
}

export interface SearchFilters {
  q: string;
  /** Words of the card's text (its effects), « Toutes les cartes » only: `effectText` of the unified search. */
  text: string;
  mainCost: string;
  recallCost: string;
  sets: string[];
  rarities: string[];
  types: string[];
  /** Only on the card browser: the editor locks the faction to the hero's. */
  factions: string[];
  environment: 'all' | 'frontier';
  effects: EffectBlock[];
  /** Uniques: the support ability (« effet de réserve », active in Reserve), one block; empty, it does not filter. */
  support: EffectBlock;
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
  /**
   * Prints listed: `off` the standard ones, `with` every printing, `only` the alt arts in the players' sense: the
   * `alt-art` and `promo` variations (products `A` and `P` of the reference, `ALT_EOLE_A_…`, `ALT_DUSTER_P_…`).
   * `with` and `only` add the promo editions of the chosen sets (`promoSets`).
   */
  altArts: AltArtsMode;
  promoSets: string[];
  /** Account tabs in the editor: only the cards the deck's format allows (`allowedInFormat`). */
  legalOnly: boolean;
  /** Editor: « Changer de faction », searched instead of the hero's faction. */
  otherFactions: string[];
}

export type AltArtsMode = 'off' | 'with' | 'only';

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
 * Uniques are listed (Uniques and the account tabs).
 */
function setsOffByDefault(source: CardSource): string[] {
  return source === 'uniques' || isAccountSource(source) ? ['FUGUE'] : ['FUGUE', 'COREKS'];
}

export const RARITY_OPTIONS = [
  { value: 'COMMON', short: 'C', label: $localize`:@@search.filters.rarity.common:Commune`, icon: assetUrl('assets/icons/rarete-commune.png') },
  { value: 'RARE', short: 'R', label: $localize`:@@search.filters.rarity.rare:Rare`, icon: assetUrl('assets/icons/rarete-rare.png') },
  { value: 'EXALTED', short: 'E', label: $localize`:@@search.filters.rarity.exalted:Exaltée`, icon: assetUrl('assets/icons/rarete-exaltee.png') },
] as const;

/** « Toutes les cartes » and the account tabs (Favoris, Collection physique, Propriété numérique) also list the Uniques. */
export const UNIQUE_RARITY = { value: 'UNIQUE', short: 'U', label: $localize`:@@search.filters.rarity.unique:Unique`, icon: assetUrl('assets/icons/rarete-unique.png') };

const RARITY_OPTIONS_WITH_UNIQUE = [...RARITY_OPTIONS, UNIQUE_RARITY];

export function rarityOptionsFor(source: CardSource): readonly { value: string; short: string; label: string; icon: string }[] {
  return source === 'uniques' ? RARITY_OPTIONS : RARITY_OPTIONS_WITH_UNIQUE;
}

/**
 * The account tabs (the user's own cards): they hold Uniques among the other cards, and their « légales » filter
 * leaves them out in a No Unique format.
 */
export function isAccountSource(source: CardSource): source is OwnedSource {
  return source === 'favorites' || source === 'collection' || source === 'owned';
}

/** The format a tab's cards must be legal in: the deck's while « légales » is on, in the tabs that offer it. */
export function legalFormat(source: CardSource, filters: SearchFilters, format: DeckFormat | null): DeckFormat | null {
  return isAccountSource(source) && filters.legalOnly ? format : null;
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
 * Sort options for `GET /api/v2/search` & `/api/v2/cards` (and fallback `/api/cards`).
 * `random` is omitted where the unified search API is active.
 */
export const ORDER_OPTIONS: { value: CardOrder; label: string }[] = [
  { value: 'setDate-desc', label: $localize`:@@search.filters.order.setDateDesc:Date set ↓` },
  { value: 'setDate-asc', label: $localize`:@@search.filters.order.setDateAsc:Date set ↑` },
  { value: 'name-asc', label: $localize`:@@search.filters.order.nameAsc:Nom A→Z` },
  { value: 'name-desc', label: $localize`:@@search.filters.order.nameDesc:Nom Z→A` },
  { value: 'number-asc', label: $localize`:@@search.filters.order.number:Numéro` },
  { value: 'number-desc', label: $localize`:@@search.filters.order.numberDesc:Numéro ↓` },
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

/**
 * The Uniques tab of a Frontier deck lists the current Frontier season only (the site's deck builder does the same);
 * `null` format (decks section, no deck open) or any other format: every Unique.
 */
export function defaultEnvironment(source: CardSource, format: DeckFormat | null = null): SearchFilters['environment'] {
  return source === 'uniques' && format === 'frontier' ? 'frontier' : 'all';
}

export function defaultFilters(source: CardSource, format: DeckFormat | null = null): SearchFilters {
  return {
    q: '',
    text: '',
    mainCost: '',
    recallCost: '',
    sets: (source === 'uniques' ? UNIQUES_SETS : ALL_CARDS_SETS).filter((s) => !setsOffByDefault(source).includes(s)),
    // « Toutes les cartes » starts with C · R · E active (U is selectable); account tabs start with all 4.
    rarities: source === 'uniques' ? [] : (source === 'all' ? RARITY_OPTIONS : RARITY_OPTIONS_WITH_UNIQUE).map((r) => r.value),
    types: source === 'uniques' ? [] : TYPE_OPTIONS.slice(0, 4).map((t) => t.value),
    factions: [],
    environment: defaultEnvironment(source, format),
    effects: [],
    support: emptySupport(),
    order: 'setDate-desc',
    noEffect: false,
    forestPower: '',
    mountainPower: '',
    oceanPower: '',
    subtypes: [],
    costRelation: '',
    altArts: 'off',
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

const MAX_COST = 15;

/**
 * True when any active numeric expression for the current source fails parsing.
 * Used to avoid firing an unfiltered request while the input displays an error state.
 */
export function hasInvalidNumericFilters(filters: SearchFilters, source: CardSource): boolean {
  if (source === 'favorites') return false;
  return (
    parseCostExpression(filters.mainCost) === null ||
    parseCostExpression(filters.recallCost) === null ||
    parseCostExpression(filters.forestPower) === null ||
    parseCostExpression(filters.mountainPower) === null ||
    parseCostExpression(filters.oceanPower) === null
  );
}

/**
 * Parses "3", "1-3", "4+" and comma lists into the explicit values the cards API
 * accepts as `mainCost[]` / `recallCost[]` (it rejects range strings with a 500).
 * Returns null when the expression is invalid, [] when empty.
 */
export function parseCostExpression(expr: string): number[] | null {
  const normalized = expr
    .trim()
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/(\d)\s*-\s*(\d)/g, '$1-$2')
    .replace(/(\d)\s*([+-])(?=\s|$|[,;])/g, '$1$2')
    .replace(/(<=|>=|<|>)\s*(\d)/g, '$1$2');
  if (!normalized) return [];
  const values = new Set<number>();
  const span = (a: number, b: number) => {
    for (let v = Math.max(0, a); v <= Math.min(MAX_COST, b); v++) values.add(v);
  };
  for (const raw of normalized.split(/[,;\s]+/).filter(Boolean)) {
    let m: RegExpExecArray | null;
    if ((m = /^(\d{1,2})$/.exec(raw))) {
      const n = Number(m[1]);
      if (n <= MAX_COST) values.add(n);
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

function uniquesStatValues(expr: string): number[] {
  const vals = parseCostExpression(expr);
  if (vals === null) return [];
  // Valid non-empty filter whose values all exceeded MAX_COST (e.g. "20", ">15")
  // must yield 0 results rather than dropping the filter.
  if (vals.length === 0 && expr.trim() !== '') return [MAX_COST + 1];
  return vals;
}

/**
 * Uniques tab (Uniques search API). Effect blocks read « Quand … ou … / Si … / Alors … ou … »:
 * values inside a criterion are OR-ed, blocks are AND-ed, as the API matches them. An exact
 * reference (`ALT_…`) looks up that card only.
 */
function resolvedFactions(filters: SearchFilters, faction: string | null): string[] {
  return faction ? (filters.otherFactions.length ? filters.otherFactions : [faction]) : filters.factions;
}

export function toUniquesQuery(filters: SearchFilters, faction: string | null): UniquesQuery {
  const q = filters.q.trim();
  const reference = /^ALT_[A-Z0-9_]+$/i.test(q) ? q.toUpperCase() : undefined;
  return {
    name: reference ? undefined : q || undefined,
    reference,
    factions: resolvedFactions(filters, faction),
    sets: filters.sets,
    subtypes: filters.subtypes,
    costRelation: filters.costRelation || undefined,
    noEffect: filters.noEffect || undefined,
    mainCosts: uniquesStatValues(filters.mainCost),
    recallCosts: uniquesStatValues(filters.recallCost),
    forestPowers: uniquesStatValues(filters.forestPower),
    mountainPowers: uniquesStatValues(filters.mountainPower),
    oceanPowers: uniquesStatValues(filters.oceanPower),
    // The UI value stays 'frontier'; the id sent is the site's current Frontier season.
    format: filters.environment === 'frontier' ? environment.uniquesFrontierFormat : undefined,
    order: filters.order !== 'random' ? filters.order : undefined,
    effects: filters.effects.map(effectIds),
    support: effectIds(filters.support),
  };
}

function effectIds(b: EffectBlock): { triggers: number[]; conditions: number[]; effects: number[] } {
  return { triggers: b.triggers.map((x) => x.id), conditions: b.conditions.map((x) => x.id), effects: b.effects.map((x) => x.id) };
}

/** The block has a value in one of its criteria at least. */
export function hasEffectCriteria(b: EffectBlock): boolean {
  return b.triggers.length > 0 || b.conditions.length > 0 || b.effects.length > 0;
}

/** Other tabs (cards API). */
/** Sets augmented with the active promo sub-sets when alt arts are included. */
export function filterSetsWithPromos(filters: SearchFilters): string[] {
  return filters.altArts !== 'off' ? [...filters.sets, ...filters.promoSets.filter((p) => !filters.sets.includes(p))] : [...filters.sets];
}

/** Variation codes matching the `altArts` mode. */
export function variationCodes(filters: SearchFilters): string[] {
  switch (filters.altArts) {
    case 'with':
      return VARIATIONS.map((v) => v.code);
    case 'only':
      return ['alt-art', 'promo'];
    default:
      return ['standard'];
  }
}

/** The card's text is searched on « Toutes les cartes » only: `effectText` of the unified search (not the Uniques). */
export function supportsTextSearch(source: CardSource): boolean {
  return source === 'all';
}

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
    effectText: filters.text.trim() || undefined,
    // The editor searches the hero's faction, or the ones chosen in « Changer de faction ».
    factions: resolvedFactions(filters, faction),
    sets: filterSetsWithPromos(filters),
    // Empty rarity selection means all rarities (C · R · E · U), matching sets/types and Classic search.
    rarities: filters.rarities,
    types: filters.types,
    variations: variationCodes(filters),
    mainCosts: uniquesStatValues(filters.mainCost),
    recallCosts: uniquesStatValues(filters.recallCost),
    forestPowers: uniquesStatValues(filters.forestPower),
    mountainPowers: uniquesStatValues(filters.mountainPower),
    oceanPowers: uniquesStatValues(filters.oceanPower),
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
  if (supportsTextSearch(source) && filters.text.trim()) chips.push({ id: 'text', label: $localize`:@@search.filters.chip.text:Texte : « ${filters.text.trim()}:text: »` });
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
  if (!isAccountSource(source) && filters.noEffect) chips.push({ id: 'noEffect', label: $localize`:@@search.filters.chip.noEffect:Sans effet` });
  const power = (id: 'forestPower' | 'mountainPower' | 'oceanPower', label: string) => {
    if (filters[id].trim()) chips.push({ id, label: `${label} : ${filters[id].trim()}` });
  };
  power('forestPower', $localize`:@@ui.terrain.forest:Forêt`);
  power('mountainPower', $localize`:@@ui.terrain.mountain:Montagne`);
  power('oceanPower', $localize`:@@ui.terrain.ocean:Océan`);
  if (filters.subtypes.length) chips.push({ id: 'subtypes', label: filters.subtypes.length === 1 ? termLabel(SUBTYPES.find((k) => k.code === filters.subtypes[0]) ?? { code: '', fr: filters.subtypes[0], en: filters.subtypes[0] }) : $localize`:@@search.filters.chip.subtypes:${filters.subtypes.length}:count: sous-types` });
  if (!isAccountSource(source) && filters.costRelation) chips.push({ id: 'costRelation', label: COST_RELATIONS.find((c) => c.value === filters.costRelation)?.label ?? '' });
  if (filters.otherFactions.length) {
    chips.push({
      id: 'otherFactions',
      label: filters.otherFactions.map((c) => FACTION_OPTIONS.find((f) => f.code === c)?.name ?? c).join(' · '),
    });
  }
  if ((source === 'all' || source === 'owned') && filters.altArts !== 'off') {
    chips.push({
      id: 'altArts',
      label: filters.altArts === 'only' ? $localize`:@@search.filters.chip.altArtsOnly:Alt arts uniquement` : $localize`:@@search.filters.chip.altArts:Alt arts`,
    });
  }
  if (source === 'uniques') {
    chips.push({ id: 'environment', label: filters.environment === 'frontier' ? 'Frontier' : $localize`:@@search.filters.chip.allUniques:Toutes` });
    const n = filters.effects.filter(hasEffectCriteria).length;
    if (n) chips.push({ id: 'effects', label: n === 1 ? $localize`:@@search.filters.chip.oneEffect:1 effet` : $localize`:@@search.filters.chip.effects:${n}:count: effets` });
    if (hasEffectCriteria(filters.support)) chips.push({ id: 'support', label: SUPPORT_TITLE });
  }
  return source === 'favorites' ? chips.filter((c) => FAVORITES_FILTERS.has(c.id)) : chips;
}

export function removeChip(filters: SearchFilters, id: string): SearchFilters {
  switch (id) {
    case 'q':
      return { ...filters, q: '' };
    case 'text':
      return { ...filters, text: '' };
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
    case 'support':
      return { ...filters, support: emptySupport() };
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
      return { ...filters, altArts: 'off', promoSets: [] };
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

/** « Effet de réserve »: the support ability of a card, the one active while it is in Reserve (the site's label). */
export const SUPPORT_TITLE = $localize`:@@search.effect.supportTitle:Effet de réserve`;

export function emptySupport(): EffectBlock {
  return { id: 'support', triggers: [], conditions: [], effects: [] };
}

/** The block the effect editor opens on: a main effect by its index, or the support effect. */
export function effectAt(filters: SearchFilters, slot: EffectSlot): EffectBlock | undefined {
  return slot === 'support' ? filters.support : filters.effects[slot];
}

/**
 * The filters once the effect editor closes on `slot`: `next` applied, or on « Annuler » the block as it was, a main effect
 * left empty (just added) taken off.
 */
export function withEditedEffect(filters: SearchFilters, slot: EffectSlot, next: EffectBlock | undefined): SearchFilters {
  if (slot === 'support') return next ? { ...filters, support: next } : filters;
  const effects = next ? filters.effects.map((e, i) => (i === slot ? next : e)) : filters.effects.filter((e, i) => i !== slot || hasEffectCriteria(e));
  return { ...filters, effects };
}
