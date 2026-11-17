import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, shareReplay, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import type { AbilityRef } from './card-filters';
import { ICONS, richText } from './card-text';
import { contentLocale } from './locale';
import type { Card, CardCollection, CardOrder, CardSearchParams, HeroGroup, Locale, Localized } from './models';
import { localizedText } from './models';
import { printKeywordCodes } from './card-vocabulary';

/**
 * Uniques search of the site (rust-cards-api, `AlteredCore.services.uniques`, `UNIQUES_API_URL`):
 * the Uniques tab. In-memory index, cursor paging, effect criteria as OR lists (effect blocks AND-ed).
 * Contract: https://github.com/Altered-Re-Union/uniques-search-api (`docs/api-spec.md`).
 */

export type AbilityKind = 'triggers' | 'conditions' | 'effects';

/** One effect block: ability ids per part, each list OR-ed. */
export interface UniquesEffect {
  triggers: number[];
  conditions: number[];
  effects: number[];
}

export interface UniquesQuery {
  /** Character name, any locale, accent-insensitive. */
  name?: string;
  /** Exact reference (`ALT_…_U_n`): a single card lookup, other criteria ignored. */
  reference?: string;
  factions: string[];
  sets: string[];
  subtypes?: string[];
  costRelation?: '' | 'equal' | 'mainHigher' | 'recallHigher';
  noEffect?: boolean;
  mainCosts: number[];
  recallCosts: number[];
  forestPowers?: number[];
  mountainPowers?: number[];
  oceanPowers?: number[];
  /** Format configured on the server (`frontier`). */
  format?: string;
  /** Single-field sort (`random` is unsupported and omitted). */
  order?: CardOrder;
  /** AND-ed; empty blocks are left out. */
  effects: UniquesEffect[];
  /** The support ability (« effet de réserve », the echo line: active in Reserve), `support[t|c|o]`; left out when empty. */
  support?: UniquesEffect;
}

/** Where an effect block is matched: a main-effect slot (its index in `UniquesQuery.effects`) or the support line. */
export type EffectSlot = number | 'support';

/** One page of results; `next` is the cursor of the next page, `null` at the end. */
export interface UniquesPage {
  member: Card[];
  totalItems: number;
  next: number | null;
}

/** CardV2 of `/api/v2/cards`, `/api/v2/search`, and `/api/v2/card/{reference}`: locale maps keyed `fr_FR`, `en_US`… */
interface CardV2 {
  kind?: 'unique' | 'nonunique';
  reference: string;
  name?: Localized;
  artist?: string;
  set?: { reference: string; name?: string; code?: string };
  cardType?: { reference?: string; name?: Localized };
  rarity?: { reference?: string; name?: string };
  cardSubTypes?: { reference?: string; name?: Localized }[];
  mainCost?: number | null;
  recallCost?: number | null;
  forestPower?: number | null;
  mountainPower?: number | null;
  oceanPower?: number | null;
  faction?: { code: string; name: string };
  mainEffect?: Localized;
  echoEffect?: Localized;
  product?: string;
  isSerialized?: boolean;
  isBanned?: boolean;
  isErrated?: boolean;
  isSuspended?: boolean;
}

interface SearchResponse {
  iter?: { total?: number; cursor?: number | null; page?: number | null };
  cards?: CardV2[];
}

interface AbilityV2 {
  idGd: number;
  text?: Localized;
  isMain?: boolean;
  isEcho?: boolean;
}

interface EffectsResponse {
  triggers?: AbilityV2[];
  conditions?: AbilityV2[];
  output?: AbilityV2[];
}

/** Pages kept in memory, least recently used first out. */
const SEARCH_CACHE_SIZE = 80;

@Service()
export class UniquesApiService {
  private readonly http = inject(HttpClient);
  readonly baseUrl = environment.uniquesApiUrl.replace(/\/$/, '');
  private readonly searchCache = new Map<string, Observable<UniquesPage>>();
  private readonly unifiedCache = new Map<string, Observable<CardCollection>>();
  private effects$?: Observable<EffectsResponse>;

  /**
   * Unified search (`GET /api/v2/search`, page-based): serves the "Toutes les cartes" tab
   * with accurate global sorting (including mana and localized name) across non-unique prints.
   */
  searchUnified(params: CardSearchParams): Observable<CardCollection> {
    const page = params.page ?? 1;
    const limit = params.itemsPerPage ?? 36;
    const q = params.q?.trim();
    if (q && /^ALT_[A-Z0-9_]+$/i.test(q)) {
      if (page > 1) return of({ member: [], totalItems: 0, currentPage: page, itemsPerPage: limit, lastPage: 1 });
      return this.byReference(q).pipe(
        map((res) => ({ member: res.member, totalItems: res.totalItems, currentPage: page, itemsPerPage: limit, lastPage: 1 })),
      );
    }
    const hp = buildUnifiedSearchParams(params);
    const key = hp.toString();
    const hit = this.unifiedCache.get(key);
    if (hit) {
      this.unifiedCache.delete(key);
      this.unifiedCache.set(key, hit);
      return hit;
    }
    const page$ = this.http.get<SearchResponse>(`${this.baseUrl}/api/v2/search`, { params: hp }).pipe(
      map((body): CardCollection => {
        const member = (body.cards ?? []).map(toCard);
        const totalItems = body.iter?.total ?? member.length;
        const lastPage = Math.max(1, Math.ceil(totalItems / Math.max(1, limit)));
        return { member, totalItems, currentPage: page, itemsPerPage: limit, lastPage };
      }),
      catchError((err: unknown) => {
        this.unifiedCache.delete(key);
        return throwError(() => err);
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.unifiedCache.set(key, page$);
    if (this.unifiedCache.size > SEARCH_CACHE_SIZE) this.unifiedCache.delete(this.unifiedCache.keys().next().value!);
    return page$;
  }

  /**
   * A page of uniques: the first one without `cursor`, the next ones with the `next` of the previous
   * page. Pages already fetched this session are replayed; errors are not kept.
   */
  search(query: UniquesQuery, cursor: number | null, limit: number): Observable<UniquesPage> {
    if (query.reference) return cursor === null ? this.byReference(query.reference) : of({ member: [], totalItems: 0, next: null });
    const params = buildUniquesParams(query, cursor, limit);
    const key = params.toString();
    const hit = this.searchCache.get(key);
    if (hit) {
      this.searchCache.delete(key);
      this.searchCache.set(key, hit);
      return hit;
    }
    const page$ = this.http.get<SearchResponse>(`${this.baseUrl}/api/v2/cards`, { params }).pipe(
      map(toPage),
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

  /**
   * Which of `references` (Uniques) are on the Frontier list: the uniques search API answers only those with
   * `format=` the site's Frontier format id (`environment.uniquesFrontierFormat`), as the site's deck builder does.
   */
  frontierLegal(references: string[]): Observable<Set<string>> {
    const params = new HttpParams().set('ref', references.join(',')).set('format', environment.uniquesFrontierFormat);
    return this.http.get<SearchResponse>(`${this.baseUrl}/api/v2/cards`, { params }).pipe(
      map((res) => new Set((res.cards ?? []).map((c) => c.reference).filter((r): r is string => !!r))),
    );
  }

  /**
   * Trigger / condition / effect vocabularies of the effect editor: the main-effect entries (`isMain`), or with `support`
   * the entries of the support line (`isEcho`), as the site's search does.
   */
  abilities(kind: AbilityKind, support = false): Observable<AbilityRef[]> {
    this.effects$ ??= this.http.get<EffectsResponse>(`${this.baseUrl}/api/v2/effects`).pipe(
      catchError((err: unknown) => {
        this.effects$ = undefined;
        return throwError(() => err);
      }),
      shareReplay(1),
    );
    return this.effects$.pipe(
      map((body) => {
        const rows = (kind === 'triggers' ? body.triggers : kind === 'conditions' ? body.conditions : body.output) ?? [];
        return toAbilityRefs(
          rows.filter((r) => (support ? r.isEcho === true : r.isMain !== false)).map((r) => ({ alteredId: r.idGd, text: fromV2Text(r.text) ?? {} })),
          kind === 'conditions' ? NO_CONDITION : undefined,
        );
      }),
    );
  }

  /**
   * Ids of `kind` that still give a card once set in `block`, the effect block at `index` of `query.effects`
   * (see `buildEffectsFilteredParams`). The editor narrows its lists to them.
   */
  narrowAbilities(query: UniquesQuery, slot: EffectSlot, block: UniquesEffect, kind: AbilityKind): Observable<Set<number>> {
    const params = buildEffectsFilteredParams(query, slot, block, kind);
    return this.http
      .get<{ idGds?: number[] }>(`${this.baseUrl}/api/v2/effects/filtered`, { params })
      .pipe(map((res) => new Set(res.idGds ?? [])));
  }

  /** Hydrate Unique and non-Unique cards by reference via `POST /api/v2/search` in chunks of 200. */
  searchBatch(references: readonly string[]): Observable<Card[]> {
    const refs = [...new Set(references.map((r) => r.trim().toUpperCase()).filter(Boolean))];
    if (!refs.length || !this.baseUrl) return of([]);
    const chunks: string[][] = [];
    for (let i = 0; i < refs.length; i += 200) chunks.push(refs.slice(i, i + 200));
    const headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' });
    return forkJoin(
      chunks.map((chunk) => {
        const body = [...chunk.map((r) => `ref[]=${encodeURIComponent(r)}`), `limit=${chunk.length}`].join('&');
        return this.http.post<SearchResponse>(`${this.baseUrl}/api/v2/search`, body, { headers }).pipe(
          map((res) => (res.cards ?? []).map(toCard)),
        );
      }),
    ).pipe(map((pages) => pages.flat()));
  }

  /** Fetch a single Unique or non-Unique card by reference via `GET /api/v2/card/{reference}`. */
  byReferenceCard(reference: string): Observable<Card> {
    return this.http
      .get<CardV2>(`${this.baseUrl}/api/v2/card/${encodeURIComponent(reference.trim().toUpperCase())}`)
      .pipe(map(toCard));
  }

  /** All heroes (36 groups) fetched from `GET /api/v2/search?cardType[]=HERO`. */
  heroes(): Observable<HeroGroup[]> {
    const fetchPage = (page: number) =>
      this.http.get<SearchResponse>(`${this.baseUrl}/api/v2/search`, {
        params: new HttpParams().append('cardType[]', 'HERO').set('limit', '200').set('page', String(page)),
      });
    return fetchPage(1).pipe(
      switchMap((first) => {
        const firstCards = first.cards ?? [];
        const total = first.iter?.total ?? firstCards.length;
        const totalPages = Math.max(1, Math.ceil(total / 200));
        if (totalPages <= 1) return of(firstCards);
        const rest$ = Array.from({ length: totalPages - 1 }, (_, i) => fetchPage(i + 2).pipe(map((r) => r.cards ?? [])));
        return forkJoin(rest$).pipe(map((pages) => [...firstCards, ...pages.flat()]));
      }),
      map(groupHeroesFromV2),
    );
  }

  /** Hydrate Unique cards by reference via `GET /api/v2/cards?ref[]=...` (e.g. fallback for favorites/collection/deck faces). */
  byReferences(references: readonly string[]): Observable<Card[]> {
    const refs = [...new Set(references.map((r) => r.trim().toUpperCase()).filter(Boolean))];
    if (!refs.length || !this.baseUrl) return of([]);
    const chunks: string[][] = [];
    for (let i = 0; i < refs.length; i += 50) chunks.push(refs.slice(i, i + 50));
    return forkJoin(
      chunks.map((chunk) => {
        let params = new HttpParams().set('limit', String(chunk.length));
        for (const r of chunk) params = params.append('ref[]', r);
        return this.http.get<SearchResponse>(`${this.baseUrl}/api/v2/cards`, { params }).pipe(
          map((res) => (res.cards ?? []).map(toCard)),
          catchError(() => of([] as Card[])),
        );
      }),
    ).pipe(map((pages) => pages.flat()));
  }

  private byReference(reference: string): Observable<UniquesPage> {
    return this.http.get<CardV2>(`${this.baseUrl}/api/v2/card/${encodeURIComponent(reference.toUpperCase())}`).pipe(
      map((card): UniquesPage => ({ member: [toCard(card)], totalItems: 1, next: null })),
      catchError((err: unknown) =>
        err instanceof HttpErrorResponse && (err.status === 400 || err.status === 404) ? of({ member: [], totalItems: 0, next: null }) : throwError(() => err),
      ),
    );
  }
}

const V2_LOCALE: Record<Locale, string> = { en: 'en_US', fr: 'fr_FR' };

const SORT_PARAM: Record<Exclude<CardOrder, 'random' | 'name-asc' | 'name-desc'>, string> = {
  'setDate-desc': 'setDate:desc',
  'setDate-asc': 'setDate:asc',
  'number-asc': 'reference:asc',
  'number-desc': 'reference:desc',
  'collector-asc': 'collector:asc',
  'collector-desc': 'collector:desc',
  'mainCost-asc': 'mainCost:asc',
  'mainCost-desc': 'mainCost:desc',
  'recallCost-asc': 'recallCost:asc',
  'recallCost-desc': 'recallCost:desc',
  'forestPower-asc': 'forestPower:asc',
  'forestPower-desc': 'forestPower:desc',
  'mountainPower-asc': 'mountainPower:asc',
  'mountainPower-desc': 'mountainPower:desc',
  'oceanPower-asc': 'oceanPower:asc',
  'oceanPower-desc': 'oceanPower:desc',
};

function sortParam(order: CardOrder | undefined, locale: Locale = contentLocale()): string | null {
  if (!order || order === 'random') return null;
  if (order === 'name-asc') return `name:${V2_LOCALE[locale]}:asc`;
  if (order === 'name-desc') return `name:${V2_LOCALE[locale]}:desc`;
  return SORT_PARAM[order];
}

/** Query string of `GET /api/v2/cards`. */
export function buildUniquesParams(query: UniquesQuery, cursor: number | null, limit: number): HttpParams {
  let hp = new HttpParams().set('limit', String(limit));
  if (cursor !== null) hp = hp.set('cursor', String(cursor));
  const sort = sortParam(query.order);
  if (sort) hp = hp.set('sort', sort);
  hp = appendCriteria(hp, query);
  const effects = query.effects.filter(hasCriteria);
  return appendSupport(appendEffects(hp, effects, effectMatchCounts(effects)), query.support);
}

/** Query string of `GET /api/v2/search` for the unified "Toutes les cartes" search. */
export function buildUnifiedSearchParams(params: CardSearchParams): HttpParams {
  let hp = new HttpParams()
    .set('page', String(params.page ?? 1))
    .set('limit', String(params.itemsPerPage ?? 36));
  const sort = sortParam(params.order, params.locale ?? contentLocale());
  if (sort) hp = hp.set('sort', sort);
  const name = params.q?.trim();
  if (name) hp = hp.set('name', name);
  // Effect text of the non-Unique prints: the API leaves the Uniques out of the results with it.
  const effectText = params.effectText?.trim();
  if (effectText) hp = hp.set('effectText', effectText);
  for (const f of params.factions ?? []) hp = hp.append('faction[]', f);
  for (const t of params.types ?? []) hp = hp.append('cardType[]', t);
  for (const r of params.rarities ?? []) hp = hp.append('rarity[]', r);
  for (const s of params.sets ?? []) hp = hp.append('set[]', s);
  for (const v of params.variations ?? []) if (v !== 'kickstarter') hp = hp.append('variation[]', v);
  for (const st of params.subtypes ?? []) hp = hp.append('subTypes[]', st);
  if (params.costRelation) hp = hp.set('costRelation', params.costRelation);
  if (params.hasNoEffect) hp = hp.set('hasNoEffect', 'true');
  hp = appendStatValues(hp, 'mainCost', params.mainCosts);
  hp = appendStatValues(hp, 'recallCost', params.recallCosts);
  hp = appendStatValues(hp, 'forestPower', params.forestPowers);
  hp = appendStatValues(hp, 'mountainPower', params.mountainPowers);
  hp = appendStatValues(hp, 'oceanPower', params.oceanPowers);
  return hp;
}

/**
 * Query string of `GET /api/v2/effects/filtered`: the `kind` ids that, set in `block` (the effect
 * block at `index` of `query.effects`, being edited), still give at least one card.
 *
 * The edited block goes last and `editing` names that slot, so the slot is right whatever the
 * position of the block and the empty blocks around it. The server leaves the edited box out and
 * keeps the block's two other boxes as constraints on the same ability. The other blocks keep the
 * `matchCount` they have among themselves: the search may ask more of them once the edited block
 * is filled (`effectMatchCounts`), never less, so no id that gives a card is left out.
 */
export function buildEffectsFilteredParams(query: UniquesQuery, slot: EffectSlot, block: UniquesEffect, kind: AbilityKind): HttpParams {
  let hp = appendCriteria(new HttpParams(), query);
  if (slot === 'support') {
    // The support block being edited, the main blocks as they are searched.
    const effects = query.effects.filter(hasCriteria);
    hp = appendSupport(appendEffects(hp, effects, effectMatchCounts(effects)), block, true);
    return hp.set('editing', `${EDITING_PART[kind]}:support`);
  }
  const others = query.effects.filter((e, i) => i !== slot && hasCriteria(e));
  hp = appendEffects(hp, [...others, block], [...effectMatchCounts(others), 1]);
  hp = appendSupport(hp, query.support);
  return hp.set('editing', `${EDITING_PART[kind]}:${others.length}`);
}

/** `support[t|c|o]` of the support block, empty parts left out; nothing for an empty block unless `always`. */
function appendSupport(hp: HttpParams, support: UniquesEffect | undefined, always = false): HttpParams {
  if (!support || (!always && !hasCriteria(support))) return hp;
  if (support.triggers.length) hp = hp.set('support[t]', support.triggers.join(','));
  if (support.conditions.length) hp = hp.set('support[c]', support.conditions.join(','));
  if (support.effects.length) hp = hp.set('support[o]', support.effects.join(','));
  return hp;
}

const EDITING_PART: Record<AbilityKind, string> = { triggers: 'trigger', conditions: 'condition', effects: 'output' };

function hasCriteria(e: UniquesEffect): boolean {
  return e.triggers.length > 0 || e.conditions.length > 0 || e.effects.length > 0;
}

function appendStatValues(hp: HttpParams, param: string, values: number[] | undefined): HttpParams {
  for (const v of values ?? []) {
    hp = v > 15 ? hp.append(`${param}[gt]`, '15') : hp.append(`${param}[]`, String(v));
  }
  return hp;
}

/** Name, factions, sets, subtypes, costs, cost relation, no-effect and format. */
function appendCriteria(hp: HttpParams, query: UniquesQuery): HttpParams {
  const name = query.name?.trim();
  if (name) hp = hp.set('name', name);
  for (const f of query.factions) hp = hp.append('faction[]', f);
  for (const s of query.sets) hp = hp.append('set[]', s);
  for (const st of query.subtypes ?? []) hp = hp.append('subTypes[]', st);
  if (query.costRelation) hp = hp.set('costRelation', query.costRelation);
  if (query.noEffect) hp = hp.set('hasNoEffect', 'true');
  hp = appendStatValues(hp, 'mainCost', query.mainCosts);
  hp = appendStatValues(hp, 'recallCost', query.recallCosts);
  hp = appendStatValues(hp, 'forestPower', query.forestPowers);
  hp = appendStatValues(hp, 'mountainPower', query.mountainPowers);
  hp = appendStatValues(hp, 'oceanPower', query.oceanPowers);
  if (query.format) hp = hp.set('format', query.format);
  return hp;
}

/** `effect[N][t|c|o]` for each block, empty parts left out, with its `matchCount` above 1. */
function appendEffects(hp: HttpParams, effects: UniquesEffect[], counts: number[]): HttpParams {
  effects.forEach((e, i) => {
    if (e.triggers.length) hp = hp.set(`effect[${i}][t]`, e.triggers.join(','));
    if (e.conditions.length) hp = hp.set(`effect[${i}][c]`, e.conditions.join(','));
    if (e.effects.length) hp = hp.set(`effect[${i}][o]`, e.effects.join(','));
    if (counts[i] > 1) hp = hp.set(`effect[${i}][matchCount]`, String(counts[i]));
  });
  if (effects.length > 1) hp = hp.set('effectMode', 'and');
  return hp;
}

/** The API accepts `matchCount` 1 to 3. */
const MAX_MATCH_COUNT = 3;

/**
 * `a` covers `b` when every ability that matches `b` also matches `a`: on each part, `a` is « any »
 * or lists every value of `b`.
 */
function covers(a: UniquesEffect, b: UniquesEffect): boolean {
  const part = (x: number[], y: number[]) => !x.length || (y.length > 0 && y.every((id) => x.includes(id)));
  return part(a.triggers, b.triggers) && part(a.conditions, b.conditions) && part(a.effects, b.effects);
}

/**
 * `matchCount` of each effect block. The API ANDs blocks per card, so one ability of the card can
 * answer several blocks: « {J} Piochez une carte » matches both « Quand {J} · Alors Piochez » and
 * « Alors Piochez ». Each ability should answer one block. A block that covers `k` other blocks
 * needs `k + 1` matching abilities: necessary in every case, and exact when the blocks it covers
 * are nested (identical blocks, or « Piochez » after « {J} · Piochez »). Blocks that overlap
 * without one covering the other stay approximate: the API has no way to ask for distinct abilities.
 */
export function effectMatchCounts(effects: UniquesEffect[]): number[] {
  return effects.map((e, i) => Math.min(MAX_MATCH_COUNT, 1 + effects.filter((o, j) => j !== i && covers(e, o)).length));
}

function toPage(body: SearchResponse): UniquesPage {
  const cursor = body.iter?.cursor;
  return { member: (body.cards ?? []).map(toCard), totalItems: body.iter?.total ?? 0, next: typeof cursor === 'number' ? cursor : null };
}

/** `fr_FR` → `fr`: the locale keys of the rest of the app. */
function fromV2Locales(value: Localized | undefined): Localized | undefined {
  if (!value) return undefined;
  const out: Localized = {};
  for (const [key, text] of Object.entries(value)) if (text) out[key.slice(0, 2)] = text;
  return Object.keys(out).length ? out : undefined;
}

/** Effect texts: as `fromV2Locales`, with the `[FLEETING]` keyword codes printed in each language. */
function fromV2Text(value: Localized | undefined): Localized | undefined {
  const out = fromV2Locales(value);
  if (out) for (const [key, text] of Object.entries(out)) if (text) out[key] = printKeywordCodes(text, key);
  return out;
}

const CHARACTER = { reference: 'CHARACTER', name: { fr: 'Personnage', en: 'Character', de: 'Charakter', es: 'Personaje', it: 'Personaggio' } };

function heroVariation(c: CardV2): string {
  if (c.isSerialized) return 'serialized';
  if (c.product === 'P') return 'promo';
  if (c.product === 'A') return 'alt-art';
  if (c.set?.reference === 'COREKS' || c.reference.split('_')[1] === 'COREKS') return 'kickstarter';
  return 'standard';
}

function groupHeroesFromV2(cards: readonly CardV2[]): HeroGroup[] {
  const byKey = new Map<string, { faction: string; name: string; prints: { reference: string; variation: string }[] }>();
  for (const c of cards) {
    const faction = c.faction?.code;
    if (!faction || !c.reference) continue;
    const names = fromV2Locales(c.name);
    const keyName = (c.name?.['en_US'] || c.name?.['en'] || Object.values(names ?? {})[0] || c.reference).toLowerCase();
    const key = `${faction}:${keyName}`;
    let entry = byKey.get(key);
    if (!entry) {
      entry = { faction, name: localizedText(names, contentLocale()) || c.reference, prints: [] };
      byKey.set(key, entry);
    }
    entry.prints.push({ reference: c.reference, variation: heroVariation(c) });
  }
  const groups: HeroGroup[] = [];
  for (const [slug, entry] of byKey) {
    const standard = entry.prints.filter((p) => p.variation === 'standard' && /_B_/.test(p.reference));
    const reference = standard[0]?.reference ?? entry.prints[0]?.reference;
    if (reference) groups.push({ slug, name: entry.name, faction: entry.faction, reference, prints: entry.prints });
  }
  return groups;
}

/** CardV2 → the app's Card (preserves rich non-unique metadata; defaults missing fields to Character/Unique). */
export function toCard(c: CardV2): Card {
  const cardType = c.cardType?.reference
    ? { reference: c.cardType.reference, name: fromV2Locales(c.cardType.name) }
    : CHARACTER;
  return {
    reference: c.reference,
    name: fromV2Locales(c.name),
    rarity: { reference: c.rarity?.reference ?? 'UNIQUE' },
    faction: c.faction,
    cardType,
    cardSubTypes: (c.cardSubTypes ?? []).map((s) => ({ reference: s.reference, name: fromV2Locales(s.name) })),
    mainCost: c.mainCost,
    recallCost: c.recallCost,
    forestPower: c.forestPower,
    mountainPower: c.mountainPower,
    oceanPower: c.oceanPower,
    mainEffect: fromV2Text(c.mainEffect) ?? null,
    echoEffect: fromV2Text(c.echoEffect) ?? null,
    artists: c.artist ? [{ name: c.artist }] : [],
    set: c.set ? { reference: c.set.reference, name: c.set.name, code: c.set.code } : undefined,
    isBanned: c.isBanned,
    isErrated: c.isErrated,
    isSuspended: c.isSuspended,
  };
}

/** Label of the conditions' `[]` row: the API matches it on abilities printed without a condition. */
export const NO_CONDITION = $localize`:@@rules.ability.noCondition:Sans condition`;

/** Symbol-only triggers shown with their glyph: played from hand, from reserve, from anywhere. */
const PLAY_TRIGGERS = ['H', 'R', 'J'];

/**
 * Labels in the content language, sorted, duplicates and placeholders dropped. With `emptyLabel`,
 * the `[]` row (no value printed) is kept first under that label instead of being dropped.
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
    const cleaned = cleanAbilityText(raw);
    if (!cleaned || cleaned === '•' || /^\{[A-Z]\}$/.test(cleaned)) continue;
    // `{D}`, `{V}` as the card's symbols, `[Fugace]` in bold: `text` keeps the plain reading (search, sort, screen readers).
    const { rich, plain: text } = richText(cleaned);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(rich ? { id: row.alteredId, text, rich } : { id: row.alteredId, text });
  }
  out.sort((a, b) => a.text.localeCompare(b.text, contentLocale()));
  return empty ? [empty, ...out] : out;
}

function cleanAbilityText(text: string): string {
  return text
    .replace(/^\{T\}$/, $localize`:@@rules.icon.exhaustMe:Épuisez-moi`)
    .replace(/^\{D\}[\s\u00a0]*:?$/, $localize`:@@rules.icon.discardMeFromReserve:Défaussez-moi de la Réserve`)
    .replace(/^\{I\}[\s\u00a0]*/, '')
    // The trigger's trailing \u00ab \u2014 \u00bb or \u00ab : \u00bb (\u00ab Lorsque \u2026 \u2014 \u00bb), printed before the effect on the card.
    .replace(/[\s\u00a0:\u2014\u2013]+$/g, '')
    .replace(/[\s\u00a0]+/g, ' ')
    .trim();
}
