import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, shareReplay, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import type { AbilityRef } from './card-filters';
import { type CardSuggestion, looksLikeReference, toSuggestions } from './card-suggestions';
import { ICONS, richText } from './card-text';
import { printKeywordCodes } from './card-vocabulary';
import { uniqueNeedsPrintedEffect } from './deck-view';
import { contentLocale } from './locale';
import type {
  Card,
  CardCollection,
  CardOrder,
  CardSearchParams,
  EffectFilterBlock,
  Faction,
  HeroGroup,
  Locale,
  Localized,
} from './models';
import { localizedText } from './models';
import { encodeLegacyStat, encodeUnifiedStat } from './numeric-filter';

export type { HeroGroup } from './models';

export type AbilityKind = 'triggers' | 'conditions' | 'effects';

/** Where an effect block is matched: a main-effect slot (its index in `effects`) or the support line. */
export type EffectSlot = number | 'support';

/** Pages kept in memory, least recently used first out (a search page is ~90 KB of JSON). */
const SEARCH_CACHE_SIZE = 80;

/** Bounded LRU cache shared across search, legacy fallback, and subtype facets. */
class LruCache<K, V> {
  private readonly entries = new Map<K, V>();
  constructor(private readonly capacity: number) {}

  get(key: K): V | undefined {
    const hit = this.entries.get(key);
    if (hit !== undefined) {
      this.entries.delete(key);
      this.entries.set(key, hit);
    }
    return hit;
  }

  set(key: K, value: V): void {
    this.entries.delete(key);
    this.entries.set(key, value);
    if (this.entries.size > this.capacity) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
  }

  delete(key: K): void {
    this.entries.delete(key);
  }
}

/** CardV2 of `/api/v2/search` and `/api/v2/card/{reference}`: locale maps keyed `fr_FR`, `en_US`… */
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
  legalFormats?: string[];
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
  spellOnly?: boolean;
}

interface EffectsResponse {
  triggers?: AbilityV2[];
  conditions?: AbilityV2[];
  output?: AbilityV2[];
}

interface RawCardGroup {
  slug: string;
  name?: Localized | string;
  faction?: Faction;
  cards?: { reference: string; variation?: string }[];
}

/**
 * Single deep card catalog boundary for Re:Builder.
 *
 * Uses `uniques-search-api` (`/api/v2/search`, `/api/v2/card/{ref}`, `/api/v2/effects`,
 * `/api/v2/effects/filtered`, `/api/v2/search/facets`, `/api/v2/artists`) as primary backend
 * and isolates legacy `cards-api` (`/api/cards`, `/api/cards/batch`, `/api/card_groups`)
 * behind internal fallback adapters when `uniquesApiUrl` is unconfigured or missing a print.
 */
@Service()
export class CardCatalogService {
  private readonly http = inject(HttpClient);
  readonly baseUrl = environment.uniquesApiUrl.replace(/\/$/, '');
  readonly legacyBaseUrl = environment.cardsApiUrl.replace(/\/$/, '');

  private readonly unifiedCache = new LruCache<string, Observable<CardCollection>>(SEARCH_CACHE_SIZE);
  private readonly legacyCache = new LruCache<string, Observable<CardCollection>>(SEARCH_CACHE_SIZE);
  private readonly facetsCache = new LruCache<string, Observable<Record<string, number> | null>>(SEARCH_CACHE_SIZE);
  private effects$?: Observable<EffectsResponse>;
  private artists$?: Observable<string[]>;
  private heroes$?: Observable<HeroGroup[]>;
  /** Unique faces fetched this session, by `locale|reference`. */
  private readonly faces = new Map<string, Card>();

  /** True when the unified search API (`uniquesApiUrl`) is configured. */
  get supportsUnified(): boolean {
    return !!this.baseUrl;
  }

  /**
   * Unified card search (`GET /api/v2/search`, page-based), falling back to legacy `/api/cards`
   * only when `uniquesApiUrl` is unconfigured. Pages already fetched this session are replayed;
   * errors are not cached.
   */
  search(params: CardSearchParams): Observable<CardCollection> {
    if (!this.baseUrl) return this.searchLegacy(params);

    const page = params.page ?? 1;
    const limit = params.itemsPerPage ?? 36;
    const q = params.q?.trim();
    if (q && /^ALT_[A-Z0-9_]+$/i.test(q)) {
      if (page > 1) return of({ member: [], totalItems: 0, currentPage: page, itemsPerPage: limit, lastPage: 1 });
      return this.byReferenceV2OrEmpty(q).pipe(
        map((cards) => ({ member: cards, totalItems: cards.length, currentPage: page, itemsPerPage: limit, lastPage: 1 })),
      );
    }

    const hp = buildUnifiedSearchParams(params);
    const key = hp.toString();
    const hit = this.unifiedCache.get(key);
    if (hit) return hit;

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
    return page$;
  }

  /** Fetch a single Unique or non-Unique card by reference (`GET /api/v2/card/{ref}` with legacy fallback). */
  byReference(reference: string, locale = 'en'): Observable<Card> {
    const legacy$ = this.http.get<Card>(
      `${this.legacyBaseUrl}/api/cards/reference/${encodeURIComponent(reference)}`,
      { params: { locale } },
    );
    if (!this.baseUrl) return legacy$;
    return this.http
      .get<CardV2>(`${this.baseUrl}/api/v2/card/${encodeURIComponent(reference.trim().toUpperCase())}`)
      .pipe(map(toCard), catchError(() => legacy$));
  }

  /**
   * Hydrate Unique and non-Unique cards by reference via `POST /api/v2/search` in chunks of 200,
   * falling back to legacy `POST /api/cards/batch` only for references missing from the unified index.
   */
  batch(references: string[], locale = 'en'): Observable<Card[]> {
    const refs = [...new Set(references.map((r) => r.trim().toUpperCase()).filter(Boolean))];
    if (!refs.length) return of([]);
    if (!this.baseUrl) return this.batchFromLegacy(refs, locale);

    return this.searchBatchV2(refs).pipe(
      switchMap((found) => {
        const seen = new Set(found.map((c) => c.reference));
        const missing = refs.filter((r) => !seen.has(r));
        if (!missing.length) return of(found);
        return this.batchFromLegacy(missing, locale).pipe(
          map((rest) => [...found, ...rest]),
          catchError(() => of(found)),
        );
      }),
      catchError(() => this.batchFromLegacy(refs, locale)),
    );
  }

  /**
   * Faces of the Uniques in `cards` missing their printed effect (`uniqueNeedsPrintedEffect`),
   * cached for the session by `locale|reference`.
   */
  uniqueFaces(cards: Card[]): Observable<Map<string, Card>> {
    const locale = contentLocale();
    const refs = [...new Set(cards.filter(uniqueNeedsPrintedEffect).map((c) => c.reference))];
    const known = () =>
      new Map(refs.flatMap((r) => (this.faces.has(`${locale}|${r}`) ? [[r, this.faces.get(`${locale}|${r}`)!] as const] : [])));
    const missing = refs.filter((r) => !this.faces.has(`${locale}|${r}`));
    if (!missing.length) return of(known());
    return this.batch(missing, locale).pipe(
      map((full) => {
        full.forEach((c) => this.faces.set(`${locale}|${c.reference}`, c));
        return known();
      }),
      catchError(() => of(known())),
    );
  }

  /** All heroes (36 groups), cached for the session (primary `/api/v2/search?cardType[]=HERO`, legacy fallback). */
  heroes(): Observable<HeroGroup[]> {
    const legacy$ = this.http
      .get<{ member: RawCardGroup[] }>(`${this.legacyBaseUrl}/api/card_groups`, {
        params: { cardType: 'HERO', itemsPerPage: 100 },
      })
      .pipe(map((body) => (body.member ?? []).map(toHeroGroup).filter((h): h is HeroGroup => !!h)));

    if (this.baseUrl) {
      this.heroes$ ??= this.heroesFromV2().pipe(
        catchError(() => legacy$),
        shareReplay(1),
      );
    } else {
      this.heroes$ ??= legacy$.pipe(shareReplay(1));
    }
    return this.heroes$;
  }

  /** Cards per subtype for a search query (`GET /api/v2/search/facets`), LRU cached. */
  subtypeFacets(params: HttpParams): Observable<Record<string, number> | null> {
    if (!this.baseUrl) return of(null);
    const key = params.toString();
    const hit = this.facetsCache.get(key);
    if (hit) return hit;

    const facets$ = this.http.get<{ subTypes?: Record<string, number> }>(`${this.baseUrl}/api/v2/search/facets`, { params }).pipe(
      map((res) => res.subTypes ?? {}),
      catchError(() => {
        this.facetsCache.delete(key);
        return of(null);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.facetsCache.set(key, facets$);
    return facets$;
  }

  /** Every artist of the catalog (`GET /api/v2/artists`), once per session. */
  artists(): Observable<string[]> {
    if (!this.baseUrl) return of([]);
    this.artists$ ??= this.http.get<{ artists?: string[] }>(`${this.baseUrl}/api/v2/artists`).pipe(
      map((res) => (res.artists ?? []).filter((a) => !!a?.trim())),
      catchError(() => of([])),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.artists$;
  }

  /** Trigger / condition / effect vocabularies from `GET /api/v2/effects` (main or echo/support). */
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
          rows
            .filter((r) => (support ? r.isEcho === true : r.isMain !== false))
            .map((r) => ({ alteredId: r.idGd, text: fromV2Text(r.text) ?? {}, spellOnly: r.spellOnly })),
          kind === 'conditions' ? NO_CONDITION : undefined,
        );
      }),
    );
  }

  /**
   * Ids of `kind` that still give a matching card once set in `block` at `slot` of `params`.
   * Accepts the single unified `CardSearchParams` query shape.
   */
  narrowAbilities(params: CardSearchParams, slot: EffectSlot, block: EffectFilterBlock, kind: AbilityKind): Observable<Set<number>> {
    const hp = buildEffectsFilteredParams(params, slot, block, kind);
    return this.http
      .get<{ idGds?: number[] }>(`${this.baseUrl}/api/v2/effects/filtered`, { params: hp })
      .pipe(map((res) => new Set(res.idGds ?? [])));
  }

  /** Card suggestions for the community deck filter (`GET /api/v2/search`). */
  suggestCards(query: string, locale: Locale, limit = 12): Observable<CardSuggestion[]> {
    const q = query.trim();
    if (!q || !this.baseUrl) return of([]);
    const url = `${this.baseUrl}/api/v2/search`;
    const byName = () =>
      this.http
        .get<SearchResponse>(url, {
          params: new HttpParams()
            .set('name', q)
            .append('rarity[]', 'COMMON')
            .append('rarity[]', 'RARE')
            .append('rarity[]', 'EXALTED')
            .append('variation[]', 'standard')
            .set('limit', '80'),
        })
        .pipe(map((res) => toSuggestions((res.cards ?? []).map(toCard), q, locale, limit)));
    if (!looksLikeReference(q)) return byName();
    return this.http
      .get<SearchResponse>(url, { params: new HttpParams().append('ref[]', q.toUpperCase()).set('limit', '1') })
      .pipe(
        switchMap((res) => {
          const cards = (res.cards ?? []).map(toCard);
          return cards.length ? of(toSuggestions(cards, '', locale, limit)) : byName();
        }),
      );
  }

  /** Suggestion of one canonical reference (card filter read from URL), or `null`. */
  suggestionOf(reference: string, locale: Locale): Observable<CardSuggestion | null> {
    return this.suggestCards(reference, locale, 1).pipe(
      map((list) => list.find((s) => s.reference === reference.toUpperCase()) ?? list[0] ?? null),
    );
  }

  // ── Internal V2 & legacy fallback adapters ─────────────────────────────────

  private byReferenceV2OrEmpty(reference: string): Observable<Card[]> {
    return this.http.get<CardV2>(`${this.baseUrl}/api/v2/card/${encodeURIComponent(reference.toUpperCase())}`).pipe(
      map((card) => [toCard(card)]),
      catchError((err: unknown) =>
        err instanceof HttpErrorResponse && (err.status === 400 || err.status === 404) ? of([] as Card[]) : throwError(() => err),
      ),
    );
  }

  private searchBatchV2(refs: readonly string[]): Observable<Card[]> {
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

  private heroesFromV2(): Observable<HeroGroup[]> {
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

  private searchLegacy(params: CardSearchParams): Observable<CardCollection> {
    const hp = buildLegacyCardsSearchParams(params);
    if (params.order === 'random') {
      return this.http.get<CardCollection | Card[]>(`${this.legacyBaseUrl}/api/cards`, { params: hp }).pipe(map(normalizeCollection));
    }
    const key = hp.toString();
    const hit = this.legacyCache.get(key);
    if (hit) return hit;

    const page$ = this.http.get<CardCollection | Card[]>(`${this.legacyBaseUrl}/api/cards`, { params: hp }).pipe(
      map(normalizeCollection),
      catchError((err: unknown) => {
        this.legacyCache.delete(key);
        return throwError(() => err);
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.legacyCache.set(key, page$);
    return page$;
  }

  private batchFromLegacy(refs: readonly string[], locale: string): Observable<Card[]> {
    return this.http
      .post<Card[] | { member: Card[] }>(`${this.legacyBaseUrl}/api/cards/batch`, { references: refs }, {
        params: { locale },
      })
      .pipe(map((body) => (Array.isArray(body) ? body : body.member ?? [])));
  }
}

// ── Unified query builders ───────────────────────────────────────────────────

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

function appendUnifiedCriteria(hp: HttpParams, params: CardSearchParams): HttpParams {
  const q = params.q?.trim();
  if (q) hp = hp.set('q', q);
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
  if (params.hasZeroPower) hp = hp.set('hasZeroPower', 'true');
  for (const a of params.artists ?? []) hp = hp.append('artist[]', a);
  if (params.format) hp = hp.set('format', params.format);
  hp = encodeUnifiedStat(hp, 'mainCost', params.mainCosts);
  hp = encodeUnifiedStat(hp, 'recallCost', params.recallCosts);
  hp = encodeUnifiedStat(hp, 'forestPower', params.forestPowers);
  hp = encodeUnifiedStat(hp, 'mountainPower', params.mountainPowers);
  hp = encodeUnifiedStat(hp, 'oceanPower', params.oceanPowers);
  return hp;
}

/** Query string of `GET /api/v2/search` for unified card search (both uniques and non-uniques). */
export function buildUnifiedSearchParams(params: CardSearchParams): HttpParams {
  let hp = new HttpParams()
    .set('page', String(params.page ?? 1))
    .set('limit', String(params.itemsPerPage ?? 36));
  const sort = sortParam(params.order, params.locale ?? contentLocale());
  if (sort) hp = hp.set('sort', sort);
  hp = appendUnifiedCriteria(hp, params);
  const effects = (params.effects ?? []).filter(hasCriteria);
  return appendSupport(appendEffects(hp, effects, effectMatchCounts(effects)), params.support);
}

const EDITING_PART: Record<AbilityKind, string> = { triggers: 'trigger', conditions: 'condition', effects: 'output' };

/**
 * Query string of `GET /api/v2/effects/filtered` using unified `CardSearchParams`:
 * keeps rarities, cardTypes, format, effectText, and all other active filters in sync.
 */
export function buildEffectsFilteredParams(
  params: CardSearchParams,
  slot: EffectSlot,
  block: EffectFilterBlock,
  kind: AbilityKind,
): HttpParams {
  let hp = appendUnifiedCriteria(new HttpParams(), params);
  const allEffects = params.effects ?? [];
  if (slot === 'support') {
    const effects = allEffects.filter(hasCriteria);
    hp = appendSupport(appendEffects(hp, effects, effectMatchCounts(effects)), block, true);
    return hp.set('editing', `${EDITING_PART[kind]}:support`);
  }
  const others = allEffects.filter((e, i) => i !== slot && hasCriteria(e));
  hp = appendEffects(hp, [...others, block], [...effectMatchCounts(others), 1]);
  hp = appendSupport(hp, params.support);
  return hp.set('editing', `${EDITING_PART[kind]}:${others.length}`);
}

function appendSupport(hp: HttpParams, support: EffectFilterBlock | undefined, always = false): HttpParams {
  if (!support || (!always && !hasCriteria(support))) return hp;
  if (support.triggers.length) hp = hp.set('support[t]', support.triggers.join(','));
  if (support.conditions.length) hp = hp.set('support[c]', support.conditions.join(','));
  if (support.effects.length) hp = hp.set('support[o]', support.effects.join(','));
  return hp;
}

function hasCriteria(e: EffectFilterBlock): boolean {
  return e.triggers.length > 0 || e.conditions.length > 0 || e.effects.length > 0;
}

function appendEffects(hp: HttpParams, effects: EffectFilterBlock[], counts: number[]): HttpParams {
  effects.forEach((e, i) => {
    if (e.triggers.length) hp = hp.set(`effect[${i}][t]`, e.triggers.join(','));
    if (e.conditions.length) hp = hp.set(`effect[${i}][c]`, e.conditions.join(','));
    if (e.effects.length) hp = hp.set(`effect[${i}][o]`, e.effects.join(','));
    if (counts[i] > 1) hp = hp.set(`effect[${i}][matchCount]`, String(counts[i]));
  });
  if (effects.length > 1) hp = hp.set('effectMode', 'and');
  return hp;
}

const MAX_MATCH_COUNT = 3;

function covers(a: EffectFilterBlock, b: EffectFilterBlock): boolean {
  const part = (x: number[], y: number[]) => !x.length || (y.length > 0 && y.every((id) => x.includes(id)));
  return part(a.triggers, b.triggers) && part(a.conditions, b.conditions) && part(a.effects, b.effects);
}

/** `matchCount` of each effect block when nested/identical blocks require distinct matching abilities. */
export function effectMatchCounts(effects: readonly EffectFilterBlock[]): number[] {
  return effects.map((e, i) => Math.min(MAX_MATCH_COUNT, 1 + effects.filter((o, j) => j !== i && covers(e, o)).length));
}

// ── Legacy `/api/cards` fallback helpers ─────────────────────────────────────

const LEGACY_TIE_BREAK: [string, string][] = [['order[setDate]', 'desc'], ['order[collectorNumberFormatedId]', 'asc']];

const LEGACY_ORDER_PARAM: Record<string, [string, string][]> = {
  'setDate-desc': [['order[setDate]', 'desc'], ['order[cardNumber]', 'asc'], ['order[collectorNumberFormatedId]', 'asc']],
  'setDate-asc': [['order[setDate]', 'asc'], ['order[cardNumber]', 'asc'], ['order[collectorNumberFormatedId]', 'asc']],
  'number-asc': [['order[cardNumber]', 'asc'], ['order[collectorNumberFormatedId]', 'asc']],
  'number-desc': [['order[cardNumber]', 'desc'], ['order[collectorNumberFormatedId]', 'asc']],
  'collector-asc': [['order[collectorNumberFormatedId]', 'asc']],
  'collector-desc': [['order[collectorNumberFormatedId]', 'desc']],
  ...Object.fromEntries(
    ['mainCost', 'recallCost', 'forestPower', 'mountainPower', 'oceanPower'].flatMap((field) =>
      (['asc', 'desc'] as const).map((dir) => [`${field}-${dir}`, [[`order[${field}]`, dir], ...LEGACY_TIE_BREAK]]),
    ),
  ),
};

export function buildLegacyCardsSearchParams(params: CardSearchParams): HttpParams {
  let hp = new HttpParams()
    .set('page', String(params.page ?? 1))
    .set('itemsPerPage', String(params.itemsPerPage ?? 24));

  if (params.locale) hp = hp.set('locale', params.locale);

  const q = params.q?.trim();
  if (q) {
    hp = /^ALT_[A-Z0-9_]+$/i.test(q) ? hp.set('reference', q.toUpperCase()) : hp.set('name', q);
  }

  const factions = params.factions ?? [];
  if (factions.length === 1) hp = hp.set('faction.code', factions[0]);
  else for (const code of factions) hp = hp.append('faction.code[]', code);

  for (const t of params.types ?? []) hp = hp.append('cardType[]', t);
  for (const r of params.rarities ?? []) hp = hp.append('rarity[]', r);
  for (const s of params.sets ?? []) hp = hp.append('set.reference[]', s);
  for (const v of params.variations ?? ['standard']) hp = hp.append('variation[]', v);
  hp = encodeLegacyStat(hp, 'mainCost', params.mainCosts);
  hp = encodeLegacyStat(hp, 'recallCost', params.recallCosts);
  hp = encodeLegacyStat(hp, 'forestPower', params.forestPowers);
  hp = encodeLegacyStat(hp, 'mountainPower', params.mountainPowers);
  hp = encodeLegacyStat(hp, 'oceanPower', params.oceanPowers);
  for (const t of params.subtypes ?? []) hp = hp.append('subTypes[]', t);
  if (params.costRelation) hp = hp.set('costRelation', params.costRelation);
  if (params.hasNoEffect) hp = hp.set('hasNoEffect', 'true');

  const order = params.order;
  if (order === 'random') {
    hp = hp.set('random', 'true');
  } else if (order) {
    for (const [key, dir] of LEGACY_ORDER_PARAM[order] ?? []) hp = hp.set(key, dir);
  }
  return hp;
}

function normalizeCollection(body: CardCollection | Card[]): CardCollection {
  if (Array.isArray(body)) {
    return { member: body, totalItems: body.length, currentPage: 1, itemsPerPage: body.length, lastPage: 1 };
  }
  const member = body.member ?? [];
  const totalItems = body.totalItems ?? member.length;
  const itemsPerPage = body.itemsPerPage ?? 24;
  const lastPage = body.lastPage ?? Math.max(1, Math.ceil(totalItems / Math.max(1, itemsPerPage)));
  return { member, totalItems, currentPage: body.currentPage ?? 1, itemsPerPage, lastPage };
}

function toHeroGroup(g: RawCardGroup): HeroGroup | null {
  const faction = g.faction?.code;
  const standard = (g.cards ?? []).filter((c) => c.variation === 'standard' && /_B_/.test(c.reference));
  const reference = standard[0]?.reference ?? g.cards?.[0]?.reference;
  if (!faction || !reference) return null;
  const prints = (g.cards ?? []).map((c) => ({ reference: c.reference, variation: c.variation ?? '' }));
  return { slug: g.slug, name: localizedText(g.name, contentLocale()) || reference, faction, reference, prints };
}

// ── CardV2 & AbilityV2 adaptation ────────────────────────────────────────────

function fromV2Locales(value: Localized | undefined): Localized | undefined {
  if (!value) return undefined;
  const out: Localized = {};
  for (const [key, text] of Object.entries(value)) if (text) out[key.slice(0, 2)] = text;
  return Object.keys(out).length ? out : undefined;
}

function fromV2Text(value: Localized | undefined): Localized | undefined {
  const out = fromV2Locales(value);
  if (out) for (const [key, text] of Object.entries(out)) if (text) out[key] = printKeywordCodes(text, key);
  return out;
}

const CHARACTER = {
  reference: 'CHARACTER',
  name: { fr: 'Personnage', en: 'Character', de: 'Charakter', es: 'Personaje', it: 'Personaggio' },
};

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
    gameplayFormat: c.legalFormats?.map((f) => f.toUpperCase()),
  };
}

/** Label of the conditions' `[]` row: the API matches it on abilities printed without a condition. */
export const NO_CONDITION = $localize`:@@rules.ability.noCondition:Sans condition`;

const PLAY_TRIGGERS = ['H', 'R', 'J'];

/**
 * Labels in the content language, sorted (spell-only entries last), duplicates merged via `extraIds`
 * and placeholders dropped. With `emptyLabel`, the `[]` row stays first.
 */
export function toAbilityRefs(
  rows: { alteredId: number; text: Localized; spellOnly?: boolean }[],
  emptyLabel?: string,
): AbilityRef[] {
  const seen = new Map<string, AbilityRef>();
  const out: AbilityRef[] = [];
  let empty: AbilityRef | undefined;
  for (const row of rows) {
    const raw = localizedText(row.text, contentLocale()).trim();
    if (raw === '[]') {
      if (emptyLabel && !empty) empty = { id: row.alteredId, text: emptyLabel };
      continue;
    }
    const code = /^\{([A-Z])\}[\s\u00a0]*:?$/.exec(raw)?.[1];
    if (code && (PLAY_TRIGGERS.includes(code) || code === 'T')) {
      const icon = ICONS[code];
      const existingIcon = seen.get(icon.title);
      if (!existingIcon) {
        const ref: AbilityRef = row.spellOnly
          ? { id: row.alteredId, text: icon.title, glyph: icon.glyph, spellOnly: true }
          : { id: row.alteredId, text: icon.title, glyph: icon.glyph };
        out.push(ref);
        seen.set(icon.title, ref);
      } else if (!row.spellOnly) {
        delete existingIcon.spellOnly;
      }
      continue;
    }
    const cleaned = cleanAbilityText(raw);
    if (!cleaned || cleaned === '•' || /^\{[A-Z]\}$/.test(cleaned)) continue;
    const { rich, plain: text } = richText(cleaned);
    if (!text) continue;
    const existing = seen.get(text);
    if (existing) {
      if (row.alteredId !== existing.id && !existing.extraIds?.includes(row.alteredId)) {
        existing.extraIds = [...(existing.extraIds ?? []), row.alteredId];
      }
      if (!row.spellOnly) delete existing.spellOnly;
      continue;
    }
    const ref: AbilityRef = rich ? { id: row.alteredId, text, rich } : { id: row.alteredId, text };
    if (row.spellOnly) ref.spellOnly = true;
    seen.set(text, ref);
    out.push(ref);
  }
  out.sort((a, b) => (a.spellOnly ? 1 : 0) - (b.spellOnly ? 1 : 0) || a.text.localeCompare(b.text, contentLocale()));
  return empty ? [empty, ...out] : out;
}

function cleanAbilityText(text: string): string {
  return text
    .replace(/^\{T\}[\s\u00a0]*:?$/, $localize`:@@rules.icon.exhaustMe:Épuisez-moi`)
    .replace(/^\{D\}[\s\u00a0]*:?$/, $localize`:@@rules.icon.discardMeFromReserve:Défaussez-moi de la Réserve`)
    .replace(/^\{I\}[\s\u00a0]*/, '')
    .replace(/[\s\u00a0:\u2014\u2013]+$/g, '')
    .replace(/[\s\u00a0]+/g, ' ')
    .trim();
}
