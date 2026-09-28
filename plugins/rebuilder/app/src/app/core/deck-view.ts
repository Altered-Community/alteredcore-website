import { isUniqueReference } from './card-art';
import { echoText } from './card-text';
import { computeDeckStatus, rarityCountsFromRefs, rarityOf, typeOf, type RarityCounts } from './deck-rules';
import { formatInfo } from './formats';
import type { Card, Deck, DeckCardLine, DeckFormat, DeckHero, HydratedLine } from './models';
import { deckLines, localizedText } from './models';

/** Rich line → Card (decks API detail lines and guest lines carry name, type, costs, powers). */
export function lineToCard(line: DeckCardLine): Card {
  return {
    reference: line.cardReference,
    name: typeof line.name === 'string' ? line.name : localizedText(line.name, 'fr') || line.cardReference,
    cardType: line.cardTypeReference ? { reference: line.cardTypeReference } : undefined,
    faction: line.factionCode ? { code: line.factionCode, name: line.factionCode } : undefined,
    mainCost: line.mainCost ?? null,
    recallCost: line.recallCost ?? null,
    forestPower: line.forestPower ?? null,
    mountainPower: line.mountainPower ?? null,
    oceanPower: line.oceanPower ?? null,
    mainEffect: line.mainEffect ?? null,
    echoEffect: line.echoEffect ?? null,
  };
}

/** A unique whose deck line has no printed effect yet (guest reload, or a decks API line). */
export function uniqueNeedsPrintedEffect(card: Card): boolean {
  return isUniqueReference(card.reference) && !localizedText(card.mainEffect, 'fr') && !echoText(card.echoEffect);
}

/**
 * Fills the face `ar-unique-card` draws from a cards API payload, without replacing stats or text
 * the deck line already has.
 */
export function mergeUniqueFace(current: Card, full: Card): Card {
  return {
    ...current,
    name: localizedText(current.name, 'fr') ? current.name : full.name ?? current.name,
    faction: current.faction ?? full.faction,
    rarity: current.rarity ?? full.rarity,
    cardType: localizedText(current.cardType?.name, 'fr') ? current.cardType : full.cardType ?? current.cardType,
    cardSubTypes: current.cardSubTypes?.length ? current.cardSubTypes : full.cardSubTypes,
    mainCost: current.mainCost ?? full.mainCost,
    recallCost: current.recallCost ?? full.recallCost,
    forestPower: current.forestPower ?? full.forestPower,
    mountainPower: current.mountainPower ?? full.mountainPower,
    oceanPower: current.oceanPower ?? full.oceanPower,
    mainEffect: localizedText(current.mainEffect, 'fr') ? current.mainEffect : full.mainEffect,
    echoEffect: echoText(current.echoEffect) ? current.echoEffect : full.echoEffect,
    collectorNumberFormatedId: current.collectorNumberFormatedId || full.collectorNumberFormatedId,
    artists: current.artists?.length ? current.artists : full.artists,
    set: current.set ?? full.set,
    transfuge: current.transfuge ?? full.transfuge,
  };
}

export function cardToLine(card: Card, quantity: number): DeckCardLine {
  return {
    cardReference: card.reference,
    quantity,
    name: localizedText(card.name, 'fr') || card.reference,
    factionCode: card.faction?.code ?? null,
    cardTypeReference: card.cardType?.reference ?? null,
    mainCost: card.mainCost ?? null,
    recallCost: card.recallCost ?? null,
    forestPower: card.forestPower ?? null,
    mountainPower: card.mountainPower ?? null,
    oceanPower: card.oceanPower ?? null,
    ...(isUniqueReference(card.reference)
      ? { mainEffect: card.mainEffect ?? null, echoEffect: card.echoEffect ?? null }
      : {}),
  };
}

export function isHeroLine(line: DeckCardLine, hero?: DeckHero | null): boolean {
  return line.cardTypeReference === 'HERO' || (!!hero && line.cardReference === hero.reference);
}

export function heroOf(deck: Deck): DeckHero | null {
  if (deck.hero) return deck.hero;
  const line = deckLines(deck).find((l) => l.cardTypeReference === 'HERO');
  if (line) {
    return {
      reference: line.cardReference,
      name: typeof line.name === 'string' ? line.name : localizedText(line.name, 'fr'),
      faction: line.factionCode || factionFromReference(line.cardReference),
    };
  }
  const statsHero = deck.stats?.hero;
  if (statsHero?.reference) {
    return {
      reference: statsHero.reference,
      name: statsHero.name ?? '',
      faction: factionFromReference(statsHero.reference),
    };
  }
  return null;
}

export function factionFromReference(ref: string): string {
  return /^ALT_[^_]+_[^_]+_([A-Z]{2})_/.exec(ref)?.[1] ?? '';
}

export interface DeckListItem {
  id: string;
  name: string;
  hero: DeckHero | null;
  format: DeckFormat;
  formatLabel: string;
  formatTone: 'blue' | 'violet' | 'neutral';
  legal: boolean;
  isPublic: boolean;
  /** Owner's username, when the API exposes it. */
  author: string | null;
  total: number;
  rarity: RarityCounts;
  guest: boolean;
  /** Last modification: see `lastModified`. */
  updatedAt: string;
  /** `upvoteCount` / `hasUpvoted` of the decks API. */
  likes: number;
  liked: boolean;
}

export function toDeckListItem(deck: Deck): DeckListItem {
  const hero = heroOf(deck);
  const lines = deckLines(deck);
  const byRarity = deck.stats?.byRarity;
  const rarity: RarityCounts = byRarity && !lines.length
    ? { C: byRarity.C ?? 0, R: byRarity.R ?? 0, U: byRarity.U ?? 0, E: byRarity.E ?? 0 }
    : rarityCountsFromRefs(lines.filter((l) => !isHeroLine(l, hero)), hero?.reference);
  const total = lines.length
    ? lines.filter((l) => !isHeroLine(l, hero)).reduce((n, l) => n + l.quantity, 0)
    : deck.stats?.totalCards ?? rarity.C + rarity.R + rarity.U + rarity.E;
  const info = formatInfo(deck.format);
  const legal = deck.legal ?? (lines.length
    ? computeDeckStatus(lines.filter((l) => !isHeroLine(l, hero)).map((l) => ({ card: lineToCard(l), quantity: l.quantity })), info.value).legal
    : false);
  return {
    id: deck.id,
    name: deck.name || 'Sans nom',
    hero,
    format: info.value,
    formatLabel: info.label,
    formatTone: info.badgeTone,
    legal: !!legal && !!hero,
    isPublic: !!deck.isPublic,
    author: authorOf(deck),
    total,
    rarity,
    guest: !!deck.guest,
    updatedAt: lastModified(deck),
    likes: deck.upvoteCount ?? 0,
    liked: !!deck.hasUpvoted,
  };
}

/**
 * The latest of `createdAt` and `updatedAt`, or the one present: creating a deck counts as modifying it (the API leaves
 * `updatedAt` null until the first edit). `''` when neither is a valid date.
 */
export function lastModified(deck: Pick<Deck, 'createdAt' | 'updatedAt'>): string {
  const dates = [deck.createdAt, deck.updatedAt].filter((d): d is string => !!d && !Number.isNaN(Date.parse(d)));
  return dates.reduce((latest, d) => (Date.parse(d) > Date.parse(latest) ? d : latest), dates[0] ?? '');
}

function authorOf(deck: Deck): string | null {
  const user = deck.user;
  if (!user || Array.isArray(user)) return null;
  return user.username?.trim() || null;
}

export type DeckGroupId = 'characters' | 'spells' | 'permanents' | 'other';

export const GROUP_LABELS: Record<DeckGroupId, { label: string; type: string }> = {
  characters: { label: 'Personnages', type: 'Personnage' },
  spells: { label: 'Sorts', type: 'Sort' },
  permanents: { label: 'Permanents', type: 'Permanent' },
  other: { label: 'Autres', type: 'Carte' },
};

export interface DeckGroup {
  id: DeckGroupId;
  label: string;
  count: number;
  distinct: number;
  lines: HydratedLine[];
}

function groupIdOf(card: Card): DeckGroupId {
  const t = typeOf(card);
  if (t === 'CHARACTER' || t === 'TOKEN') return 'characters';
  if (t === 'SPELL') return 'spells';
  if (t.includes('PERMANENT')) return 'permanents';
  return 'other';
}

/** Groups non-hero lines by type, sorted by main cost then name (decklist order). */
export function groupLines(lines: HydratedLine[]): DeckGroup[] {
  const buckets = new Map<DeckGroupId, HydratedLine[]>();
  for (const line of lines) {
    if (typeOf(line.card) === 'HERO' || line.quantity <= 0) continue;
    const id = groupIdOf(line.card);
    buckets.set(id, [...(buckets.get(id) ?? []), line]);
  }
  const order: DeckGroupId[] = ['characters', 'spells', 'permanents', 'other'];
  return order
    .filter((id) => buckets.has(id))
    .map((id) => {
      const rows = [...(buckets.get(id) ?? [])].sort(
        (a, b) =>
          (a.card.mainCost ?? 99) - (b.card.mainCost ?? 99) ||
          localizedText(a.card.name, 'fr').localeCompare(localizedText(b.card.name, 'fr'), 'fr'),
      );
      return {
        id,
        label: GROUP_LABELS[id].label,
        count: rows.reduce((n, l) => n + l.quantity, 0),
        distinct: rows.length,
        lines: rows,
      };
    });
}

/** Groups by main cost (1…7+) for the "Par coût" decklist view. */
export function groupByCost(lines: HydratedLine[]): DeckGroup[] {
  const buckets = new Map<number, HydratedLine[]>();
  for (const line of lines) {
    if (typeOf(line.card) === 'HERO' || line.quantity <= 0) continue;
    const c = Math.min(7, Math.max(0, line.card.mainCost ?? 0));
    buckets.set(c, [...(buckets.get(c) ?? []), line]);
  }
  return [...buckets.keys()]
    .sort((a, b) => a - b)
    .map((c) => {
      const rows = buckets.get(c) ?? [];
      return {
        id: 'other' as DeckGroupId,
        label: c >= 7 ? 'Coût 7+' : `Coût ${c}`,
        count: rows.reduce((n, l) => n + l.quantity, 0),
        distinct: rows.length,
        lines: rows,
      };
    });
}

export interface DeckStatsView {
  main: number[];
  reserve: number[];
  terrain: { foret: number; montagne: number; ocean: number };
  rarity: RarityCounts;
}

export function deckStats(lines: HydratedLine[]): DeckStatsView {
  const main = [0, 0, 0, 0, 0, 0, 0];
  const reserve = [0, 0, 0, 0, 0, 0, 0];
  const terrain = { foret: 0, montagne: 0, ocean: 0 };
  const rarity: RarityCounts = { C: 0, R: 0, U: 0, E: 0 };
  const bucket = (v: number | null | undefined) => Math.min(6, Math.max(0, (v ?? 1) - 1));
  for (const { card, quantity } of lines) {
    if (typeOf(card) === 'HERO' || quantity <= 0) continue;
    main[bucket(card.mainCost)] += quantity;
    reserve[bucket(card.recallCost)] += quantity;
    if (typeOf(card) === 'CHARACTER') {
      terrain.foret += (card.forestPower ?? 0) * quantity;
      terrain.montagne += (card.mountainPower ?? 0) * quantity;
      terrain.ocean += (card.oceanPower ?? 0) * quantity;
    }
    const r = rarityOf(card);
    rarity[r === 'RARE' ? 'R' : r === 'UNIQUE' ? 'U' : r === 'EXALTED' ? 'E' : 'C'] += quantity;
  }
  return { main, reserve, terrain, rarity };
}

/** Plain-text decklist, one "qty reference" per line (the format the community site imports). */
export function decklistText(lines: HydratedLine[], hero?: DeckHero | null): string {
  const rows = lines.filter((l) => l.quantity > 0 && typeOf(l.card) !== 'HERO');
  const out = hero ? [`1 ${hero.reference}`] : [];
  for (const l of rows) out.push(`${l.quantity} ${l.card.reference}`);
  return out.join('\n');
}
