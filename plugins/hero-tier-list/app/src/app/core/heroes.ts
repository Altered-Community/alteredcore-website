import { environment } from '../../environments/environment';
import type { Locale } from './i18n';

export const FACTIONS = ['AX', 'BR', 'LY', 'MU', 'OR', 'YZ'] as const;
export type Faction = (typeof FACTIONS)[number];

export const FACTION_NAMES: Record<Faction, string> = {
  AX: 'Axiom',
  BR: 'Bravos',
  LY: 'Lyra',
  MU: 'Muna',
  OR: 'Ordis',
  YZ: 'Yzmir',
};

/** Design-system token of each faction's colour (`--ac-faction-*`). */
export const FACTION_TOKENS: Record<Faction, string> = {
  AX: '--ac-faction-axiom',
  BR: '--ac-faction-bravos',
  LY: '--ac-faction-lyra',
  MU: '--ac-faction-muna',
  OR: '--ac-faction-ordis',
  YZ: '--ac-faction-yzmir',
};

/** Sets in release order. A hero belongs to the set of its first standard print. */
export const SETS = ['CORE', 'COREKS', 'ALIZE', 'BISE', 'CYCLONE', 'DUSTER', 'EOLE', 'FUGUE'] as const;

/** Names of the sets that brought heroes (Altered Re:Union naming, as in Re:Builder's card search). */
export const HERO_SET_NAMES: Record<string, string> = {
  CORE: $localize`:@@sets.core:Au-delà des portes`,
  CYCLONE: $localize`:@@sets.cyclone:Odyssée des cieux`,
  DUSTER: $localize`:@@sets.duster:Les Graines de l’Unité`,
  EOLE: $localize`:@@sets.eole:Les Racines de la Corruption`,
  FUGUE: $localize`:@@sets.fugue:La Traversée Éternelle`,
};

export interface Hero {
  /** Card group slug (`AX-001-C`): stable, used in saved rankings. */
  id: string;
  name: string;
  faction: Faction;
  /** Standard print of the hero's first set (`ALT_CORE_B_AX_01_C`), for its art. */
  reference: string;
  set: string;
}

/** A card group of `GET /api/card_groups?cardType=HERO` (cards API), only the fields read here. */
export interface RawHeroGroup {
  slug?: string;
  name?: Partial<Record<string, string>> | string;
  faction?: { code?: string };
  cards?: { reference: string; variation?: string; set?: { reference?: string } }[];
}

export function setOfReference(ref: string): string {
  return ref.split('_')[1] ?? '';
}

export function toHero(group: RawHeroGroup, locale: Locale): Hero | null {
  const faction = group.faction?.code as Faction | undefined;
  if (!group.slug || !faction || !FACTIONS.includes(faction)) return null;
  // Standard prints of the base game (`_B_`), Kickstarter copies left out: the first one released holds the art.
  const prints = (group.cards ?? [])
    .filter((c) => c.variation === 'standard' && /_B_/.test(c.reference) && setOfReference(c.reference) !== 'COREKS')
    .sort((a, b) => setRank(setOfReference(a.reference)) - setRank(setOfReference(b.reference)));
  const reference = prints[0]?.reference;
  if (!reference) return null;
  const names = typeof group.name === 'string' ? { [locale]: group.name } : (group.name ?? {});
  const name = names[locale] || names['en'] || names['fr'] || reference;
  return { id: group.slug, name, faction, reference, set: setOfReference(reference) };
}

function setRank(set: string): number {
  const i = (SETS as readonly string[]).indexOf(set);
  return i < 0 ? SETS.length : i;
}

/** Natural order of the pool: faction, then set, then name. */
export function compareHeroes(a: Hero, b: Hero): number {
  return (
    FACTIONS.indexOf(a.faction) - FACTIONS.indexOf(b.faction) ||
    setRank(a.set) - setRank(b.set) ||
    a.reference.localeCompare(b.reference, 'en', { numeric: true })
  );
}

/**
 * The hero's full art without the card frame, on the CDN: the `illustrations/` cut (744 × 1039 WebP), then the HD
 * JPEG of the same cut, then the art with the Altered logo. All three send `Access-Control-Allow-Origin: *`, which
 * the PNG export needs to draw them on a canvas.
 */
export function heroArtSources(hero: Pick<Hero, 'reference' | 'set'>): string[] {
  const cdn = environment.cdnUrl.replace(/\/$/, '');
  const { reference: ref, set } = hero;
  return [
    `${cdn}/illustrations/${set}/${ref}_FRAMELESS_T1.webp`,
    `${cdn}/illustrations_hd/${set}/${ref}_FRAMELESS_T1.jpg`,
    `${cdn}/cards/assets/${set}/${ref}.webp`,
  ];
}

export async function fetchHeroes(locale: Locale, fetchFn: typeof fetch = fetch): Promise<Hero[]> {
  const base = environment.cardsApiUrl.replace(/\/$/, '');
  const res = await fetchFn(`${base}/api/card_groups?cardType=HERO&itemsPerPage=100`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`cards API: HTTP ${res.status}`);
  const body = (await res.json()) as RawHeroGroup[] | { member?: RawHeroGroup[] };
  const groups = Array.isArray(body) ? body : (body.member ?? []);
  return groups
    .map((g) => toHero(g, locale))
    .filter((h): h is Hero => !!h)
    .sort(compareHeroes);
}
