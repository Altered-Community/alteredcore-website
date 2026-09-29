import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import type { AbilityRef } from './card-filters';
import { ICONS } from './card-text';
import { contentLocale } from './locale';
import type { Card, Localized } from './models';
import { localizedText } from './models';

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
  mainCosts: number[];
  recallCosts: number[];
  /** Format configured on the server (`frontier`). */
  format?: string;
  /** AND-ed; empty blocks are left out. */
  effects: UniquesEffect[];
}

/** One page of results; `next` is the cursor of the next page, `null` at the end. */
export interface UniquesPage {
  member: Card[];
  totalItems: number;
  next: number | null;
}

/** CardV2 of `/api/v2/cards` and `/api/v2/card/{reference}`: locale maps keyed `fr_FR`, `en_US`… */
interface CardV2 {
  reference: string;
  name?: Localized;
  artist?: string;
  set?: { reference: string; name?: string; code?: string };
  cardSubTypes?: { reference?: string; name?: Localized }[];
  mainCost?: number | null;
  recallCost?: number | null;
  forestPower?: number | null;
  mountainPower?: number | null;
  oceanPower?: number | null;
  faction?: { code: string; name: string };
  mainEffect?: Localized;
  echoEffect?: Localized;
}

interface SearchResponse {
  iter?: { total?: number; cursor?: number | null };
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
  private effects$?: Observable<EffectsResponse>;

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

  /** Trigger / condition / effect vocabularies of the effect editor (main-effect entries). */
  abilities(kind: AbilityKind): Observable<AbilityRef[]> {
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
          rows.filter((r) => r.isMain !== false).map((r) => ({ alteredId: r.idGd, text: fromV2Locales(r.text) ?? {} })),
          kind === 'conditions' ? NO_CONDITION : undefined,
        );
      }),
    );
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

/** Query string of `GET /api/v2/cards`. */
export function buildUniquesParams(query: UniquesQuery, cursor: number | null, limit: number): HttpParams {
  let hp = new HttpParams().set('limit', String(limit));
  if (cursor !== null) hp = hp.set('cursor', String(cursor));
  const name = query.name?.trim();
  if (name) hp = hp.set('name', name);
  for (const f of query.factions) hp = hp.append('faction[]', f);
  for (const s of query.sets) hp = hp.append('set[]', s);
  for (const c of query.mainCosts) hp = hp.append('mainCost[]', String(c));
  for (const c of query.recallCosts) hp = hp.append('recallCost[]', String(c));
  if (query.format) hp = hp.set('format', query.format);
  const effects = query.effects.filter((e) => e.triggers.length || e.conditions.length || e.effects.length);
  const counts = effectMatchCounts(effects);
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

const CHARACTER = { reference: 'CHARACTER', name: { fr: 'Personnage', en: 'Character', de: 'Charakter', es: 'Personaje', it: 'Personaggio' } };

/** CardV2 → the app's Card (uniques are all Characters). */
export function toCard(c: CardV2): Card {
  return {
    reference: c.reference,
    name: fromV2Locales(c.name),
    rarity: { reference: 'UNIQUE' },
    faction: c.faction,
    cardType: CHARACTER,
    cardSubTypes: (c.cardSubTypes ?? []).map((s) => ({ reference: s.reference, name: fromV2Locales(s.name) })),
    mainCost: c.mainCost,
    recallCost: c.recallCost,
    forestPower: c.forestPower,
    mountainPower: c.mountainPower,
    oceanPower: c.oceanPower,
    mainEffect: fromV2Locales(c.mainEffect) ?? null,
    echoEffect: fromV2Locales(c.echoEffect) ?? null,
    artists: c.artist ? [{ name: c.artist }] : [],
    set: c.set ? { reference: c.set.reference, name: c.set.name, code: c.set.code } : undefined,
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
    .replace(/^\{T\}$/, $localize`:@@rules.icon.exhaustMe:Épuisez-moi`)
    .replace(/^\{D\}[\s\u00a0]*:?$/, $localize`:@@rules.icon.discardMeFromReserve:Défaussez-moi de la Réserve`)
    .replace(/^\{I\}[\s\u00a0]*/, '')
    .replace(/[\s\u00a0:]+$/g, '')
    .replace(/[\s\u00a0]+/g, ' ')
    .trim();
}
