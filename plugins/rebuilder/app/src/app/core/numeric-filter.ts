import type { HttpParams } from '@angular/common/http';

/** Maximum stat value accepted by the search APIs (0..=15). */
export const MAX_STAT_VALUE = 15;

/**
 * Result of parsing a user-entered numeric filter expression (`"3"`, `"1-3"`, `"1 3"`, `"4+"`,
 * `"4-"`, `"<4"`, `">=2"`). Distinguishes empty, invalid, and valid-but-impossible (e.g. `"20"`,
 * `">15"`) expressions without relying on magic sentinel integers like `[16]`.
 */
export type ParsedNumericFilter =
  | { readonly kind: 'empty' }
  | { readonly kind: 'invalid' }
  | { readonly kind: 'impossible' }
  | { readonly kind: 'values'; readonly values: readonly number[] };

/** Accepts either a typed `ParsedNumericFilter` or an explicit integer array (for callers/tests). */
export type NumericFilterInput = ParsedNumericFilter | readonly number[];

const EMPTY_FILTER: ParsedNumericFilter = { kind: 'empty' };
const INVALID_FILTER: ParsedNumericFilter = { kind: 'invalid' };
const IMPOSSIBLE_FILTER: ParsedNumericFilter = { kind: 'impossible' };

/**
 * Canonical whitespace-aware parser shared across Re:Builder (aligned with PHP `cacValidateNumExpr`
 * and classic JS `parseNumExpr`):
 * - Spaces around ranges and operators collapse (`"1 - 3"` → `"1-3"`, `">= 4"` → `">=4"`, `"4 +"` → `"4+"`).
 * - Space-separated numbers act as a list (`"1 3"` → `[1, 3]`).
 */
export function parseNumericFilter(expr: string): ParsedNumericFilter {
  const normalized = expr
    .trim()
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/(\d)\s*-\s*(\d)/g, '$1-$2')
    .replace(/(\d)\s*([+-])(?=\s|$|[,;])/g, '$1$2')
    .replace(/(<=|>=|<|>)\s*(\d)/g, '$1$2');
  if (!normalized) return EMPTY_FILTER;
  if (/^[,;]|[,;]$|[,;]\s*[,;]/.test(normalized)) return INVALID_FILTER;

  const values = new Set<number>();
  const span = (a: number, b: number) => {
    for (let v = Math.max(0, a); v <= Math.min(MAX_STAT_VALUE, b); v++) values.add(v);
  };

  for (const raw of normalized.split(/[,;\s]+/).filter(Boolean)) {
    let m: RegExpExecArray | null;
    if ((m = /^(\d{1,2})$/.exec(raw))) {
      const n = Number(m[1]);
      if (n <= MAX_STAT_VALUE) values.add(n);
    } else if ((m = /^(\d{1,2})-(\d{1,2})$/.exec(raw))) {
      const [a, b] = [Number(m[1]), Number(m[2])].sort((x, y) => x - y);
      span(a, b);
    } else if ((m = /^(\d{1,2})\+$/.exec(raw))) {
      span(Number(m[1]), MAX_STAT_VALUE);
    } else if ((m = /^(\d{1,2})-$/.exec(raw))) {
      span(0, Number(m[1]));
    } else if ((m = /^(<=|>=|<|>)(\d{1,2})$/.exec(raw))) {
      const n = Number(m[2]);
      if (m[1] === '<') span(0, n - 1);
      else if (m[1] === '<=') span(0, n);
      else if (m[1] === '>') span(n + 1, MAX_STAT_VALUE);
      else span(n, MAX_STAT_VALUE);
    } else {
      return INVALID_FILTER;
    }
  }

  if (values.size === 0) return IMPOSSIBLE_FILTER;
  return { kind: 'values', values: [...values].sort((x, y) => x - y) };
}

/**
 * Convenience adapter returning `null` on invalid input, `[]` on empty/impossible input,
 * or the sorted integer values in `0..=15`.
 */
export function parseCostExpression(expr: string): number[] | null {
  const parsed = parseNumericFilter(expr);
  if (parsed.kind === 'invalid') return null;
  if (parsed.kind === 'values') return [...parsed.values];
  return [];
}

/** Encode a stat filter for `/api/v2/search` and `/api/v2/effects/filtered` (`param[]` or `param[gt]=15`). */
export function encodeUnifiedStat(hp: HttpParams, param: string, input: NumericFilterInput | undefined): HttpParams {
  if (!input) return hp;
  if (Array.isArray(input)) {
    for (const v of input) {
      hp = v > MAX_STAT_VALUE ? hp.append(`${param}[gt]`, String(MAX_STAT_VALUE)) : hp.append(`${param}[]`, String(v));
    }
    return hp;
  }
  const parsed = input as ParsedNumericFilter;
  if (parsed.kind === 'impossible') return hp.append(`${param}[gt]`, String(MAX_STAT_VALUE));
  if (parsed.kind !== 'values') return hp;
  for (const v of parsed.values) hp = hp.append(`${param}[]`, String(v));
  return hp;
}

/** Encode a stat filter for the legacy `/api/cards` endpoint (`param[]` or `param[gt]=15`). */
export function encodeLegacyStat(hp: HttpParams, param: string, input: NumericFilterInput | undefined): HttpParams {
  return encodeUnifiedStat(hp, param, input);
}

/**
 * Encode a numeric expression for the site's account-tab proxies (`collection-search`,
 * `ownership-search`), using `[gte]`/`[lte]` for contiguous spans, `param[]` for disjoint
 * lists (exact-filtered in PHP), and `param[gt]=15` for impossible filters.
 */
export function encodeProxyStat(hp: HttpParams, param: string, expr: string): HttpParams {
  const parsed = parseNumericFilter(expr);
  if (parsed.kind === 'empty' || parsed.kind === 'invalid') return hp;
  if (parsed.kind === 'impossible') return hp.set(`${param}[gt]`, MAX_STAT_VALUE);
  const { values } = parsed;
  const min = values[0];
  const max = values[values.length - 1];
  if (values.length === max - min + 1) {
    return hp.set(`${param}[gte]`, min).set(`${param}[lte]`, max);
  }
  for (const v of values) hp = hp.append(`${param}[]`, v);
  return hp;
}
