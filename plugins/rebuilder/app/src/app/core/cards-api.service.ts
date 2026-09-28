import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import type { AbilityRef } from './card-filters';
import { ICONS } from './card-text';
import type { Card, CardCollection, CardSearchParams, Faction, Localized } from './models';
import { localizedText } from './models';
import { contentLocale } from './locale';

export type AbilityKind = 'triggers' | 'conditions' | 'effects';

const ABILITY_PATH: Record<AbilityKind, string> = {
  triggers: 'ability_triggers',
  conditions: 'ability_conditions',
  effects: 'ability_effects',
};

export interface HeroGroup {
  slug: string;
  name: string;
  faction: string;
  /** Standard-print reference (ALT_{SET}_B_{FACTION}_NN_C) used in decks and for art. */
  reference: string;
}

/** Search pages kept in memory, least recently used first out (a uniques page is ~90 KB of JSON). */
const SEARCH_CACHE_SIZE = 80;

interface RawCardGroup {
  slug: string;
  name?: Localized | string;
  faction?: Faction;
  cards?: { reference: string; variation?: string }[];
}

@Injectable({ providedIn: 'root' })
export class CardsApiService {
  private readonly http = inject(HttpClient);
  readonly baseUrl = environment.cardsApiUrl.replace(/\/$/, '');
  private readonly abilityCache = new Map<AbilityKind, Observable<AbilityRef[]>>();
  private readonly searchCache = new Map<string, Observable<CardCollection>>();
  private heroes$?: Observable<HeroGroup[]>;

  /**
   * Pages already fetched this session are replayed (tab switches, editor ↔ Cartes, same filters
   * applied again). Unsubscribing before the response still cancels the request; errors are not kept.
   */
  search(params: CardSearchParams): Observable<CardCollection> {
    const hp = buildCardsSearchParams(params);
    const key = hp.toString();
    const hit = this.searchCache.get(key);
    if (hit) {
      this.searchCache.delete(key);
      this.searchCache.set(key, hit);
      return hit;
    }
    const page$ = this.http.get<CardCollection | Card[]>(`${this.baseUrl}/api/cards`, { params: hp }).pipe(
      map((body) => normalizeCollection(body)),
      catchError((err: unknown) => {
        this.searchCache.delete(key);
        return throwError(() => err);
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.searchCache.set(key, page$);
    if (this.searchCache.size > SEARCH_CACHE_SIZE) this.searchCache.delete(this.searchCache.keys().next().value!);
    return page$;
  }

  byReference(reference: string, locale = 'en'): Observable<Card> {
    return this.http.get<Card>(
      `${this.baseUrl}/api/cards/reference/${encodeURIComponent(reference)}`,
      { params: { locale } },
    );
  }

  batch(references: string[], locale = 'en'): Observable<Card[]> {
    const refs = [...new Set(references.filter(Boolean))];
    if (!refs.length) return of([]);
    return this.http
      .post<Card[] | { member: Card[] }>(`${this.baseUrl}/api/cards/batch`, { references: refs }, {
        params: { locale },
      })
      .pipe(map((body) => (Array.isArray(body) ? body : body.member ?? [])));
  }

  factions(): Observable<Faction[]> {
    return this.http.get<Faction[] | { member: Faction[] }>(`${this.baseUrl}/api/factions`).pipe(
      map((body) => (Array.isArray(body) ? body : body.member ?? [])),
    );
  }

  /** All heroes (36 groups), cached for the session. */
  heroes(): Observable<HeroGroup[]> {
    this.heroes$ ??= this.http
      .get<{ member: RawCardGroup[] }>(`${this.baseUrl}/api/card_groups`, {
        params: { cardType: 'HERO', itemsPerPage: 100 },
      })
      .pipe(
        map((body) => (body.member ?? []).map(toHeroGroup).filter((h): h is HeroGroup => !!h)),
        shareReplay(1),
      );
    return this.heroes$;
  }

  /** Trigger / condition / effect vocabularies for the Uniques effect editor. */
  abilities(kind: AbilityKind): Observable<AbilityRef[]> {
    let cached = this.abilityCache.get(kind);
    if (!cached) {
      cached = this.http
        .get<{ member: { alteredId: number; text: Localized }[] }>(`${this.baseUrl}/api/${ABILITY_PATH[kind]}`, {
          params: { itemsPerPage: kind === 'effects' ? 1000 : 300 },
        })
        .pipe(
          map((body) => toAbilityRefs(body.member ?? [], kind === 'conditions' ? NO_CONDITION : undefined)),
          shareReplay(1),
        );
      this.abilityCache.set(kind, cached);
    }
    return cached;
  }
}

/** Label of the conditions' `[]` row: the API matches it on abilities printed without a condition. */
export const NO_CONDITION = 'Sans condition';

/** Symbol-only triggers shown with their glyph: played from hand, from reserve, from anywhere. */
const PLAY_TRIGGERS = ['H', 'R', 'J'];

/**
 * French labels, sorted, duplicates and placeholders dropped. With `emptyLabel`, the `[]` row (no
 * value printed) is kept first under that label instead of being dropped.
 */
export function toAbilityRefs(rows: { alteredId: number; text: Localized }[], emptyLabel?: string): AbilityRef[] {
  const seen = new Set<string>();
  const out: AbilityRef[] = [];
  let empty: AbilityRef | undefined;
  for (const row of rows) {
    const raw = localizedText(row.text, contentLocale()).trim();
    if (raw === '[]') {
      if (emptyLabel && !empty) empty = { id: row.alteredId, text: emptyLabel };
      continue;
    }
    const code = /^\{([A-Z])\}$/.exec(raw)?.[1];
    if (code && PLAY_TRIGGERS.includes(code)) {
      const icon = ICONS[code];
      if (!seen.has(icon.title)) out.push({ id: row.alteredId, text: icon.title, glyph: icon.glyph });
      seen.add(icon.title);
      continue;
    }
    const text = cleanAbilityText(raw);
    if (!text || text === '•' || /^\{[A-Z]\}$/.test(text) || seen.has(text)) continue;
    seen.add(text);
    out.push({ id: row.alteredId, text });
  }
  out.sort((a, b) => a.text.localeCompare(b.text, contentLocale()));
  return empty ? [empty, ...out] : out;
}

function cleanAbilityText(text: string): string {
  return text
    .replace(/^\{T\}$/, 'Épuisez-moi')
    .replace(/^\{D\}[\s\u00a0]*:?$/, 'Défaussez-moi de la Réserve')
    .replace(/^\{I\}[\s\u00a0]*/, '')
    .replace(/[\s\u00a0:]+$/g, '')
    .replace(/[\s\u00a0]+/g, ' ')
    .trim();
}

function toHeroGroup(g: RawCardGroup): HeroGroup | null {
  const faction = g.faction?.code;
  const standard = (g.cards ?? []).filter((c) => c.variation === 'standard' && /_B_/.test(c.reference));
  const reference = standard[0]?.reference ?? g.cards?.[0]?.reference;
  if (!faction || !reference) return null;
  return { slug: g.slug, name: localizedText(g.name, contentLocale()) || reference, faction, reference };
}

/** Many cards share a set date: without a unique tie-breaker, pages overlap and cards go missing. */
const ORDER_PARAM: Record<string, [string, string][]> = {
  'setDate-desc': [['order[setDate]', 'desc'], ['order[cardNumber]', 'asc'], ['order[collectorNumberFormatedId]', 'asc']],
  'setDate-asc': [['order[setDate]', 'asc'], ['order[cardNumber]', 'asc'], ['order[collectorNumberFormatedId]', 'asc']],
  'number-asc': [['order[cardNumber]', 'asc'], ['order[collectorNumberFormatedId]', 'asc']],
};

export function buildCardsSearchParams(params: CardSearchParams): HttpParams {
  let hp = new HttpParams()
    .set('page', String(params.page ?? 1))
    .set('itemsPerPage', String(params.itemsPerPage ?? 24));

  if (params.locale) hp = hp.set('locale', params.locale);

  const q = params.q?.trim();
  if (q) {
    hp = /^ALT_[A-Z0-9_]+$/i.test(q) ? hp.set('reference', q.toUpperCase()) : hp.set('name', q);
  }

  // `faction.code[]` with one value is ignored for uniques in production; the scalar form works.
  const factions = params.factions ?? [];
  if (factions.length === 1) hp = hp.set('faction.code', factions[0]);
  else for (const code of factions) hp = hp.append('faction.code[]', code);

  for (const t of params.types ?? []) hp = hp.append('cardType[]', t);
  for (const r of params.rarities ?? []) hp = hp.append('rarity[]', r);
  for (const s of params.sets ?? []) hp = hp.append('set.reference[]', s);
  for (const v of params.variations ?? ['standard']) hp = hp.append('variation[]', v);
  for (const c of params.mainCosts ?? []) hp = hp.append('mainCost[]', String(c));
  for (const c of params.recallCosts ?? []) hp = hp.append('recallCost[]', String(c));
  for (const f of params.gameplayFormats ?? []) hp = hp.append('gameplayFormat[]', f);

  // « Any » is a missing key: the Meilisearch path matches `0` literally and returns nothing.
  (params.effectSlots ?? []).forEach((slot, i) => {
    for (const part of ['trigger', 'condition', 'effect'] as const) {
      if (slot[part]) hp = hp.set(`effectSlot[${i}][${part}]`, String(slot[part]));
    }
  });
  if ((params.effectSlots ?? []).length > 1) hp = hp.set('effectSlotMode', params.effectSlotMode ?? 'or');

  if (params.hasNoEffect) hp = hp.set('hasNoEffect', 'true');
  if (params.hasEchoEffect) hp = hp.set('hasEchoEffect', 'true');

  for (const [key, dir] of params.order ? ORDER_PARAM[params.order] ?? [] : []) hp = hp.set(key, dir);
  return hp;
}

export function buildCardsSearchUrl(base: string, params: CardSearchParams): string {
  const url = new URL('/api/cards', base.endsWith('/') ? base : `${base}/`);
  return `${url.toString()}?${buildCardsSearchParams(params).toString()}`;
}

function normalizeCollection(body: CardCollection | Card[]): CardCollection {
  if (Array.isArray(body)) {
    return {
      member: body,
      totalItems: body.length,
      currentPage: 1,
      itemsPerPage: body.length,
      lastPage: 1,
    };
  }
  const member = body.member ?? [];
  const totalItems = body.totalItems ?? member.length;
  const itemsPerPage = body.itemsPerPage ?? 24;
  const lastPage =
    body.lastPage ?? Math.max(1, Math.ceil(totalItems / Math.max(1, itemsPerPage)));
  return {
    member,
    totalItems,
    currentPage: body.currentPage ?? 1,
    itemsPerPage,
    lastPage,
  };
}
