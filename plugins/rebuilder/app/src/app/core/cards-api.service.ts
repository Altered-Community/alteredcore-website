import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import type { CardOrder, Card, CardCollection, CardSearchParams, Faction, Localized } from './models';
import { localizedText } from './models';
import { contentLocale } from './locale';
import { uniqueNeedsPrintedEffect } from './deck-view';

export interface HeroGroup {
  slug: string;
  name: string;
  faction: string;
  /** Standard-print reference (ALT_{SET}_B_{FACTION}_NN_C) used in decks and for art. */
  reference: string;
  /** Every print of the hero (promo, alt arts, trophy prints), for the « Alt arts » choice. */
  prints: { reference: string; variation: string }[];
}

/** Search pages kept in memory, least recently used first out (a uniques page is ~90 KB of JSON). */
const SEARCH_CACHE_SIZE = 80;

interface RawCardGroup {
  slug: string;
  name?: Localized | string;
  faction?: Faction;
  cards?: { reference: string; variation?: string }[];
}

@Service()
export class CardsApiService {
  private readonly http = inject(HttpClient);
  readonly baseUrl = environment.cardsApiUrl.replace(/\/$/, '');
  private readonly searchCache = new Map<string, Observable<CardCollection>>();
  private heroes$?: Observable<HeroGroup[]>;
  /** Unique faces fetched this session, by `locale|reference`. */
  private readonly faces = new Map<string, Card>();

  /**
   * Pages already fetched this session are replayed (tab switches, editor ↔ Cartes, same filters
   * applied again). Unsubscribing before the response still cancels the request; errors are not kept.
   * The « Aléatoire » order is never cached: each search deals new cards.
   */
  search(params: CardSearchParams): Observable<CardCollection> {
    const hp = buildCardsSearchParams(params);
    if (params.order === 'random') {
      return this.http.get<CardCollection | Card[]>(`${this.baseUrl}/api/cards`, { params: hp }).pipe(map((body) => normalizeCollection(body)));
    }
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

  /**
   * Faces of the Uniques of `cards` that miss their printed effect (`uniqueNeedsPrintedEffect`), by reference: the
   * decks, collection and ownership APIs give a Unique's costs, not the text `ac-unique-card` prints. Kept for the
   * session; on error, the faces already known.
   */
  uniqueFaces(cards: Card[]): Observable<Map<string, Card>> {
    const locale = contentLocale();
    const refs = [...new Set(cards.filter(uniqueNeedsPrintedEffect).map((c) => c.reference))];
    const known = () => new Map(refs.flatMap((r) => (this.faces.has(`${locale}|${r}`) ? [[r, this.faces.get(`${locale}|${r}`)!] as const] : [])));
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
}

function toHeroGroup(g: RawCardGroup): HeroGroup | null {
  const faction = g.faction?.code;
  const standard = (g.cards ?? []).filter((c) => c.variation === 'standard' && /_B_/.test(c.reference));
  const reference = standard[0]?.reference ?? g.cards?.[0]?.reference;
  if (!faction || !reference) return null;
  const prints = (g.cards ?? []).map((c) => ({ reference: c.reference, variation: c.variation ?? '' }));
  return { slug: g.slug, name: localizedText(g.name, contentLocale()) || reference, faction, reference, prints };
}

/** Many cards share a set date: without a unique tie-breaker, pages overlap and cards go missing. */
/** Ties of a sort on a shared value (cost, power) go to the default order, as on the site. */
const TIE_BREAK: [string, string][] = [['order[setDate]', 'desc'], ['order[collectorNumberFormatedId]', 'asc']];

const ORDER_PARAM: Record<string, [string, string][]> = {
  'setDate-desc': [['order[setDate]', 'desc'], ['order[cardNumber]', 'asc'], ['order[collectorNumberFormatedId]', 'asc']],
  'setDate-asc': [['order[setDate]', 'asc'], ['order[cardNumber]', 'asc'], ['order[collectorNumberFormatedId]', 'asc']],
  'number-asc': [['order[cardNumber]', 'asc'], ['order[collectorNumberFormatedId]', 'asc']],
  'collector-asc': [['order[collectorNumberFormatedId]', 'asc']],
  'collector-desc': [['order[collectorNumberFormatedId]', 'desc']],
  ...Object.fromEntries(
    ['mainCost', 'recallCost', 'forestPower', 'mountainPower', 'oceanPower'].flatMap((field) =>
      (['asc', 'desc'] as const).map((dir) => [`${field}-${dir}`, [[`order[${field}]`, dir], ...TIE_BREAK]]),
    ),
  ),
};

function orderParams(order: CardOrder): [string, string][] {
  if (order === 'random') return [['random', 'true']];
  return ORDER_PARAM[order] ?? [];
}

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
  for (const c of params.forestPowers ?? []) hp = hp.append('forestPower[]', String(c));
  for (const c of params.mountainPowers ?? []) hp = hp.append('mountainPower[]', String(c));
  for (const c of params.oceanPowers ?? []) hp = hp.append('oceanPower[]', String(c));
  for (const t of params.subtypes ?? []) hp = hp.append('subTypes[]', t);
  if (params.costRelation) hp = hp.set('costRelation', params.costRelation);


  if (params.hasNoEffect) hp = hp.set('hasNoEffect', 'true');

  for (const [key, dir] of params.order ? orderParams(params.order) : []) hp = hp.set(key, dir);
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
