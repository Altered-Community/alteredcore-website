/**
 * A tier list as plain immutable data, and the pure functions that change it. The store (`tier-list.store.ts`)
 * keeps the current value, its history and its copy in `localStorage`.
 */

/** Tier colours: tokens `--ac-tier-<colour>` of the design system (light and dark values). */
export const TIER_COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'violet', 'grey'] as const;
export type TierColor = (typeof TIER_COLORS)[number];

export interface Tier {
  id: string;
  name: string;
  color: TierColor;
  /** Hero ids, in their order in the tier. */
  heroes: string[];
}

export interface Ranking {
  title: string;
  tiers: Tier[];
}

export const MAX_TIERS = 12;
export const MAX_TIER_NAME = 24;
export const MAX_TITLE = 80;

export function defaultTiers(): Tier[] {
  return (['S', 'A', 'B', 'C', 'D'] as const).map((name, i) => ({ id: `t${i}`, name, color: TIER_COLORS[i], heroes: [] }));
}

export function emptyRanking(): Ranking {
  return { title: '', tiers: defaultTiers() };
}

/** The tier holding a hero, or null when the hero is not ranked. */
export function tierOf(ranking: Ranking, heroId: string): Tier | null {
  return ranking.tiers.find((t) => t.heroes.includes(heroId)) ?? null;
}

/**
 * Puts a hero in a tier at `index` (its final position in that tier), or back in the pool (`tierId` null). Moving
 * inside its own tier reorders it.
 */
export function moveHero(ranking: Ranking, heroId: string, tierId: string | null, index = Number.MAX_SAFE_INTEGER): Ranking {
  if (tierId !== null && !ranking.tiers.some((t) => t.id === tierId)) return ranking;
  const tiers = ranking.tiers.map((t) => {
    const heroes = t.heroes.filter((id) => id !== heroId);
    if (t.id === tierId) heroes.splice(Math.max(0, Math.min(index, heroes.length)), 0, heroId);
    return heroes.length === t.heroes.length && t.id !== tierId ? t : { ...t, heroes };
  });
  return { ...ranking, tiers };
}

/** Moves a hero one place left (-1) or right (+1) in its tier. */
export function shiftHero(ranking: Ranking, heroId: string, delta: -1 | 1): Ranking {
  const tier = tierOf(ranking, heroId);
  if (!tier) return ranking;
  const index = tier.heroes.indexOf(heroId) + delta;
  if (index < 0 || index >= tier.heroes.length) return ranking;
  return moveHero(ranking, heroId, tier.id, index);
}

export function updateTier(ranking: Ranking, tierId: string, change: Partial<Pick<Tier, 'name' | 'color'>>): Ranking {
  const name = change.name === undefined ? undefined : change.name.trim().slice(0, MAX_TIER_NAME);
  return {
    ...ranking,
    tiers: ranking.tiers.map((t) =>
      t.id === tierId ? { ...t, ...(change.color ? { color: change.color } : {}), ...(name ? { name } : {}) } : t,
    ),
  };
}

export function addTier(ranking: Ranking, name: string, id = newTierId()): Ranking {
  if (ranking.tiers.length >= MAX_TIERS) return ranking;
  const color = TIER_COLORS[ranking.tiers.length % TIER_COLORS.length];
  return { ...ranking, tiers: [...ranking.tiers, { id, name: name.slice(0, MAX_TIER_NAME), color, heroes: [] }] };
}

/** Removes a tier; its heroes go back to the pool. The last tier stays. */
export function removeTier(ranking: Ranking, tierId: string): Ranking {
  if (ranking.tiers.length <= 1) return ranking;
  return { ...ranking, tiers: ranking.tiers.filter((t) => t.id !== tierId) };
}

export function moveTier(ranking: Ranking, tierId: string, delta: -1 | 1): Ranking {
  const from = ranking.tiers.findIndex((t) => t.id === tierId);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= ranking.tiers.length) return ranking;
  const tiers = [...ranking.tiers];
  [tiers[from], tiers[to]] = [tiers[to], tiers[from]];
  return { ...ranking, tiers };
}

/** Every hero back to the pool; tiers, names and colours stay. */
export function unrankAll(ranking: Ranking): Ranking {
  return { ...ranking, tiers: ranking.tiers.map((t) => ({ ...t, heroes: [] })) };
}

export function setTitle(ranking: Ranking, title: string): Ranking {
  return { ...ranking, title: title.trim().slice(0, MAX_TITLE) };
}

function newTierId(): string {
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * A ranking read back from storage, made valid: unknown fields dropped, names and title cut, a hero in one tier at
 * most. Heroes unknown today are kept (the heroes list arrives after, and may be missing while offline); the views
 * skip them.
 */
export function normalizeRanking(raw: unknown): Ranking {
  if (!raw || typeof raw !== 'object') return emptyRanking();
  const r = raw as { title?: unknown; tiers?: unknown };
  const seenTiers = new Set<string>();
  const seenHeroes = new Set<string>();
  const tiers: Tier[] = [];
  for (const t of Array.isArray(r.tiers) ? r.tiers : []) {
    if (!t || typeof t !== 'object') continue;
    const { id, name, color, heroes } = t as Record<string, unknown>;
    if (typeof id !== 'string' || !id || seenTiers.has(id)) continue;
    seenTiers.add(id);
    tiers.push({
      id,
      name: (typeof name === 'string' && name.trim().slice(0, MAX_TIER_NAME)) || '?',
      color: TIER_COLORS.includes(color as TierColor) ? (color as TierColor) : 'grey',
      heroes: (Array.isArray(heroes) ? heroes : []).filter(
        (h): h is string => typeof h === 'string' && !seenHeroes.has(h) && !!seenHeroes.add(h),
      ),
    });
    if (tiers.length === MAX_TIERS) break;
  }
  return {
    title: typeof r.title === 'string' ? r.title.slice(0, MAX_TITLE) : '',
    tiers: tiers.length ? tiers : defaultTiers(),
  };
}
