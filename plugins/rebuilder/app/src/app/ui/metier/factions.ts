import { FACTION_OPTIONS } from '../../core/card-filters';

export const FACTIONS = FACTION_OPTIONS.map((f) => ({ ...f, color: `var(--ar-faction-${f.name.toLowerCase()})` }));

export function factionColor(code: string | null | undefined): string {
  return FACTIONS.find((f) => f.code === code)?.color ?? 'var(--ar-color-text-2)';
}

export function factionName(code: string | null | undefined): string {
  return FACTIONS.find((f) => f.code === code)?.name ?? '';
}
