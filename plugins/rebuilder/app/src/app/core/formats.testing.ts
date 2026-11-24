import type { HttpTestingController } from '@angular/common/http/testing';
import type { FormatRules } from './format-rules';

/** Tests only: `GET /api/formats` of the decks API, for the formats the specs use. */
const sets = { allowed: ['CORE', 'COREKS', 'ALIZE', 'BISE', 'CYCLONE', 'DUSTER', 'EOLE'], forbidden: ['FUGUE'] };
export const TEST_FORMATS: FormatRules[] = [
  {
    code: 'standard',
    label: 'Standard',
    minCards: 39,
    maxCards: 59,
    allowBanned: false,
    allowSuspended: false,
    limits: { unique: 3, rare: 15, exalted: 3, maxCopiesPerName: 3, maxCopiesPerRarity: null },
    maxFactions: 1,
    sets,
    bannedCards: [],
    suspendedCards: [],
    uniqueAllowlist: null,
  },
  {
    code: 'nuc',
    label: 'NUC',
    minCards: 39,
    maxCards: 59,
    allowBanned: false,
    allowSuspended: false,
    limits: { unique: 0, rare: 15, exalted: 3, maxCopiesPerName: 3, maxCopiesPerRarity: null },
    maxFactions: 1,
    sets,
    bannedCards: [],
    suspendedCards: [],
    uniqueAllowlist: null,
  },
  {
    code: 'singleton',
    label: 'Singleton',
    minCards: 59,
    maxCards: 79,
    allowBanned: false,
    allowSuspended: false,
    limits: { unique: null, rare: null, exalted: null, maxCopiesPerName: 3, maxCopiesPerRarity: 1 },
    uniqueLimitsByHero: { '3': ['teija'], '5': ['sierra', 'moyo'] },
    maxFactions: 1,
    sets,
    bannedCards: [],
    suspendedCards: [],
    uniqueAllowlist: null,
  },
];

/** Answers the pending `GET /api/formats` requests (with `TEST_FORMATS`, or drops them with `false`). */
export function flushFormats(http: HttpTestingController, answer: FormatRules[] | false = TEST_FORMATS): void {
  for (const req of http.match((r) => r.url.endsWith('/api/formats'))) {
    if (answer) req.flush(answer);
  }
}
