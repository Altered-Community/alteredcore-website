import type { DeckFormat } from './models';

export type BgaAvailability = 'available' | 'arena' | 'unavailable';

export interface FormatInfo {
  value: DeckFormat;
  label: string;
  /** Long description (création). */
  description: string;
  /** Short description (réglages). */
  short: string;
  bga: BgaAvailability;
  min: number;
  max: number;
  copyMax: number;
  /** 0 = no uniques allowed. */
  uniqueMax: number;
  /** Uniques restricted to the Frontier list. */
  frontierUniques?: boolean;
  badgeTone: 'blue' | 'violet' | 'neutral';
}

export const DECK_FORMATS: readonly FormatInfo[] = [
  {
    value: 'standard',
    label: 'Standard All Uniques',
    description: $localize`:@@format.standard.description:39 à 59 cartes · 3 uniques maximum`,
    short: $localize`:@@format.standard.short:39 à 59 cartes · 3 uniques max.`,
    bga: 'available',
    min: 39,
    max: 59,
    copyMax: 3,
    uniqueMax: 3,
    badgeTone: 'blue',
  },
  {
    value: 'frontier',
    label: 'Frontier',
    description: $localize`:@@format.frontier.description:39 à 59 cartes · uniques de la liste Frontier`,
    short: $localize`:@@format.frontier.short:39 à 59 cartes · uniques de la liste Frontier`,
    bga: 'arena',
    min: 39,
    max: 59,
    copyMax: 3,
    uniqueMax: 3,
    frontierUniques: true,
    badgeTone: 'violet',
  },
  {
    value: 'nuc',
    label: 'Standard No Unique',
    description: $localize`:@@format.nuc.description:39 à 59 cartes · sans cartes uniques`,
    short: $localize`:@@format.nuc.short:39 à 59 cartes · sans uniques`,
    bga: 'available',
    min: 39,
    max: 59,
    copyMax: 3,
    uniqueMax: 0,
    badgeTone: 'blue',
  },
  {
    value: 'singleton',
    label: 'Singleton',
    description: $localize`:@@format.singleton.description:59 à 79 cartes · 1 exemplaire par carte · 3 uniques maximum`,
    short: $localize`:@@format.singleton.short:59 à 79 cartes · 1 ex. par carte`,
    bga: 'unavailable',
    min: 59,
    max: 79,
    copyMax: 1,
    uniqueMax: 3,
    badgeTone: 'blue',
  },
  {
    value: 'singleton_nuc',
    label: 'Singleton No Unique',
    description: $localize`:@@format.singletonNuc.description:59 à 79 cartes · 1 exemplaire par carte · sans uniques`,
    short: $localize`:@@format.singletonNuc.short:59 à 79 cartes · 1 ex. par carte · sans uniques`,
    bga: 'available',
    min: 59,
    max: 79,
    copyMax: 1,
    uniqueMax: 0,
    badgeTone: 'blue',
  },
  {
    value: 'sandbox',
    label: 'Sandbox',
    description: $localize`:@@format.sandbox.description:4 à 100 cartes · aucune contrainte`,
    short: $localize`:@@format.sandbox.short:4 à 100 cartes · aucune contrainte`,
    bga: 'available',
    min: 4,
    max: 100,
    copyMax: 99,
    uniqueMax: 99,
    badgeTone: 'neutral',
  },
];

export function formatInfo(format: DeckFormat | string | null | undefined): FormatInfo {
  return DECK_FORMATS.find((f) => f.value === format) ?? DECK_FORMATS[0];
}

export const BGA_LABEL: Record<BgaAvailability, { long: string; short: string; tone: 'green' | 'violet' | 'red' }> = {
  available: { long: $localize`:@@format.bga.available:BGA : disponible`, short: 'BGA', tone: 'green' },
  arena: { long: $localize`:@@format.bga.arena:Arène BGA`, short: $localize`:@@format.bga.arena:Arène BGA`, tone: 'violet' },
  unavailable: { long: $localize`:@@format.bga.unavailable:BGA : indisponible`, short: $localize`:@@format.bga.unavailableShort:BGA indispo.`, tone: 'red' },
};
