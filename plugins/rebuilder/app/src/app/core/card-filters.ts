import type { CardOrder, CardSearchParams, EffectSlot } from './models';
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

/** French set names, newest first (Altered Re:Union naming). */
export const CARD_SETS: readonly SetInfo[] = [
  { reference: 'FUGUE', name: 'La Traversée Éternelle' },
  { reference: 'EOLE', name: 'Les Racines de la Corruption' },
  { reference: 'DUSTER', name: 'Les Graines de l’Unité' },
  { reference: 'CYCLONE', name: 'Odyssée des cieux' },
  { reference: 'BISE', name: 'Murmures du Labyrinthe' },
  { reference: 'ALIZE', name: 'Épreuve du Froid' },
  { reference: 'COREKS', name: 'Au-delà des portes – KS' },
  { reference: 'CORE', name: 'Au-delà des portes' },
];

export const ALL_CARDS_SETS = ['FUGUE', 'EOLE', 'DUSTER', 'CYCLONE', 'BISE', 'ALIZE', 'CORE'];
export const UNIQUES_SETS = ['EOLE', 'DUSTER', 'CYCLONE', 'BISE', 'ALIZE', 'COREKS', 'CORE'];

export const RARITY_OPTIONS = [
  { value: 'COMMON', short: 'C', label: 'Commune', icon: assetUrl('assets/icons/rarete-commune.png') },
  { value: 'RARE', short: 'R', label: 'Rare', icon: assetUrl('assets/icons/rarete-rare.png') },
  { value: 'EXALTED', short: 'E', label: 'Exaltée', icon: assetUrl('assets/icons/rarete-exaltee.png') },
] as const;

export const TYPE_OPTIONS = [
  { value: 'CHARACTER', label: 'Personnage' },
  { value: 'SPELL', label: 'Sort' },
  { value: 'LANDMARK_PERMANENT', label: 'Repère Permanent' },
  { value: 'EXPEDITION_PERMANENT', label: 'Permanent d’Expédition' },
  { value: 'TOKEN_MANA', label: 'Mana' },
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
  { value: 'setDate-desc', label: 'Date set ↓' },
  { value: 'setDate-asc', label: 'Date set ↑' },
  { value: 'number-asc', label: 'Numéro' },
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
 * Effect blocks read "Quand … ou … / Si … / Alors … ou …": values inside a criterion are OR-ed,
 * blocks are AND-ed. The API matches `effectSlot[N]` triples; one block expands to the
 * cross product of its values (OR mode). Several blocks use AND mode on their first combination
 * each, which is the closest the API can express.
 */
export function effectSlotsFor(blocks: EffectBlock[]): { slots: EffectSlot[]; mode: 'or' | 'and' } {
  const usable = blocks.filter((b) => b.triggers.length || b.conditions.length || b.effects.length);
  const combos = (b: EffectBlock): EffectSlot[] => {
    const t = b.triggers.length ? b.triggers.map((x) => x.id) : [0];
    const c = b.conditions.length ? b.conditions.map((x) => x.id) : [0];
    const e = b.effects.length ? b.effects.map((x) => x.id) : [0];
    const out: EffectSlot[] = [];
    for (const trigger of t) for (const condition of c) for (const effect of e) out.push({ trigger, condition, effect });
    return out;
  };
  if (usable.length === 0) return { slots: [], mode: 'or' };
  if (usable.length === 1) return { slots: combos(usable[0]), mode: 'or' };
  return { slots: usable.map((b) => combos(b)[0]), mode: 'and' };
}

export function toSearchParams(
  filters: SearchFilters,
  source: CardSource,
  faction: string | null,
  page: number,
  itemsPerPage: number,
): CardSearchParams {
  const { slots, mode } = source === 'uniques' ? effectSlotsFor(filters.effects) : { slots: [], mode: 'or' as const };
  return {
    page,
    itemsPerPage,
    // `locale` is not a Meilisearch filter: with it the cards API falls back to SQL, 6–45 s for
    // uniques instead of ~0.5 s. Without it, text fields come back as locale maps.
    locale: source === 'uniques' ? undefined : contentLocale(),
    q: filters.q.trim() || undefined,
    factions: faction ? [faction] : filters.factions,
    sets: filters.sets,
    // Uniques live in their own tab: an empty rarity selection means C · R · E here.
    rarities: source === 'uniques' ? ['UNIQUE'] : filters.rarities.length ? filters.rarities : RARITY_OPTIONS.map((r) => r.value),
    types: source === 'uniques' ? [] : filters.types,
    variations: source === 'uniques' ? [] : ['standard'],
    mainCosts: parseCostExpression(filters.mainCost) ?? [],
    recallCosts: parseCostExpression(filters.recallCost) ?? [],
    gameplayFormats: source === 'uniques' && filters.environment === 'frontier' ? ['frontier'] : [],
    effectSlots: slots,
    effectSlotMode: mode,
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
  if (filters.q.trim()) chips.push({ id: 'q', label: `« ${filters.q.trim()} »` });
  if (filters.factions.length) {
    chips.push({
      id: 'factions',
      label: filters.factions.length === 1 ? FACTION_OPTIONS.find((f) => f.code === filters.factions[0])?.name ?? '1 faction' : `${filters.factions.length} factions`,
    });
  }
  if (filters.sets.length) chips.push({ id: 'sets', label: `${filters.sets.length} extension${filters.sets.length > 1 ? 's' : ''}` });
  if (source !== 'uniques' && filters.rarities.length) {
    chips.push({
      id: 'rarities',
      label: RARITY_OPTIONS.filter((r) => filters.rarities.includes(r.value)).map((r) => r.short).join(' · '),
    });
  }
  if (source !== 'uniques' && filters.types.length) {
    chips.push({ id: 'types', label: filters.types.length === 1 ? TYPE_OPTIONS.find((t) => t.value === filters.types[0])?.label ?? '1 type' : `${filters.types.length} types` });
  }
  if (filters.mainCost.trim()) chips.push({ id: 'mainCost', label: `Coût main : ${filters.mainCost.trim()}` });
  if (filters.recallCost.trim()) chips.push({ id: 'recallCost', label: `Réserve : ${filters.recallCost.trim()}` });
  if (filters.noEffect) chips.push({ id: 'noEffect', label: 'Sans effet' });
  if (filters.echo) chips.push({ id: 'echo', label: 'Effet d’écho' });
  if (source === 'uniques') {
    chips.push({ id: 'environment', label: filters.environment === 'frontier' ? 'Frontier' : 'Toutes' });
    const n = filters.effects.filter((b) => b.triggers.length || b.conditions.length || b.effects.length).length;
    if (n) chips.push({ id: 'effects', label: `${n} effet${n > 1 ? 's' : ''}` });
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
