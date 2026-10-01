import { relativeTime } from './relative-time';

describe('relativeTime', () => {
  const now = Date.parse('2026-09-26T12:00:00Z');
  const ago = (ms: number) => new Date(now - ms).toISOString();
  // Intl separates with no-break spaces.
  const fmt = (iso: string) => relativeTime(iso, now).replace(/\s/g, ' ');
  const min = 60_000;
  const day = 24 * 60 * min;

  it('formats a past date in short French', () => {
    expect(fmt(ago(20_000))).toBe('à l’instant');
    expect(fmt(ago(5 * min))).toBe('il y a 5 min');
    expect(fmt(ago(2 * 60 * min))).toBe('il y a 2 h');
    expect(fmt(ago(day + min))).toBe('hier');
    expect(fmt(ago(3 * day))).toBe('il y a 3 j');
    expect(fmt(ago(15 * day))).toBe('il y a 2 sem.');
    expect(fmt(ago(125 * day))).toBe('il y a 4 mois');
    expect(fmt(ago(400 * day))).toBe('l’année dernière');
  });

  it('returns an empty string for a missing or invalid date and clamps future dates', () => {
    expect(relativeTime('', now)).toBe('');
    expect(relativeTime('nope', now)).toBe('');
    expect(relativeTime(new Date(now + day).toISOString(), now)).toBe('à l’instant');
  });
});
