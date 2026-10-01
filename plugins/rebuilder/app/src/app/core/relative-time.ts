import { uiLocale } from './i18n';

const short = new Intl.RelativeTimeFormat(uiLocale(), { numeric: 'auto', style: 'short' });
const long = new Intl.RelativeTimeFormat(uiLocale(), { numeric: 'auto' });

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Past date as « à l’instant », « il y a 5 min », « il y a 2 h », « hier », « il y a 3 j », « il y a 2 sem. »,
 * « il y a 4 mois », « l’année dernière ». Months and years stay long (« 2 m. » reads as minutes). `''` for an invalid date.
 */
export function relativeTime(iso: string, now = Date.now()): string {
  const t = Date.parse(iso);
  if (!iso || Number.isNaN(t)) return '';
  const ago = Math.max(0, now - t);
  if (ago < MINUTE) return $localize`:@@time.justNow:à l’instant`;
  if (ago < HOUR) return short.format(-Math.floor(ago / MINUTE), 'minute');
  if (ago < DAY) return short.format(-Math.floor(ago / HOUR), 'hour');
  const days = Math.floor(ago / DAY);
  if (days < 7) return short.format(-days, 'day');
  if (days < 30) return short.format(-Math.floor(days / 7), 'week');
  if (days < 365) return long.format(-Math.floor(days / 30), 'month');
  return long.format(-Math.floor(days / 365), 'year');
}
