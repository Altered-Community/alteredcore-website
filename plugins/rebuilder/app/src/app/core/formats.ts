import type { DeckFormat } from './models';

/**
 * Formats and their rules, from the site's deck builder (`plugins/core-altered-cards/data/altered.json`,
 * `formats`), which match `GET https://decks.alteredcore.org/api/formats`. The plugin does not fetch that
 * endpoint: the table below is kept in step by hand.
 */

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
  /** Copies of one reference the editor lets the user add (`maxCopiesPerRef`; Sandbox: no limit, 99). */
  copyMax: number;
  /** Copies of one card name across references (`maxCopiesPerName`); `null` = no limit. */
  nameCopyMax: number | null;
  /** Copies of one name at one rarity (`maxCopiesPerNameRarity`, Singleton: 1); `null` = no limit. */
  nameRarityCopyMax: number | null;
  /** Copies of one Unique reference (`maxCopiesPerUnique`); `null` = no limit. */
  uniqueCopyMax: number | null;
  /** Unique cards in the deck: 0 = none allowed, `null` = no limit. */
  uniqueMax: number | null;
  /** Unique cards by hero, keyed by `heroKey()` (`AX_01`); falls back on `uniqueMax`. */
  heroUniqueLimits?: Readonly<Record<string, number>>;
  rareMax: number | null;
  exaltedMax: number | null;
  /** Every card of the hero's faction. */
  sameFaction: boolean;
  allowBanned: boolean;
  allowSuspended: boolean;
  /** Uniques restricted to the Frontier list. */
  frontierUniques?: boolean;
  badgeTone: 'blue' | 'violet' | 'neutral';
}

/**
 * Singleton: Uniques allowed by hero (3 when the hero is not listed). Source: `altered.json`
 * `formats.singleton.heroUniqueLimits` (keys `FACTION_NUMBER` of the hero reference), the same table as
 * `uniqueLimitsByHero` of `GET https://decks.alteredcore.org/api/formats` (keyed there by hero first name).
 */
const SINGLETON_HERO_UNIQUES: Readonly<Record<string, number>> = {
  MU_01: 3, // Teija
  BR_01: 3, // Kojo
  BR_03: 3, // Basira
  OR_01: 3, // Sigismar
  LY_01: 3, // Nevenka
  LY_03: 3, // Fen
  AX_02: 3, // Treyst
  AX_03: 4, // Subhash
  AX_65: 4, // Isaree
  BR_02: 4, // Atsadi
  MU_02: 4, // Arjun
  MU_65: 4, // Kauri
  MU_03: 4, // Rin
  OR_65: 4, // Zhen
  YZ_01: 4, // Akesha
  AX_01: 5, // Sierra
  BR_65: 5, // Sol
  LY_02: 5, // Auraq
  LY_65: 5, // Nadir
  OR_02: 5, // Waru
  OR_03: 5, // Gulrang
  YZ_02: 5, // Lindiwe
  YZ_03: 5, // Afanas
  YZ_65: 5, // Moyo
};

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
    nameCopyMax: 3,
    nameRarityCopyMax: null,
    uniqueCopyMax: 1,
    uniqueMax: 3,
    rareMax: 15,
    exaltedMax: 3,
    sameFaction: true,
    allowBanned: false,
    allowSuspended: false,
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
    nameCopyMax: 3,
    nameRarityCopyMax: null,
    uniqueCopyMax: 1,
    uniqueMax: 3,
    rareMax: 15,
    exaltedMax: 3,
    sameFaction: true,
    allowBanned: false,
    allowSuspended: false,
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
    nameCopyMax: 3,
    nameRarityCopyMax: null,
    uniqueCopyMax: 1,
    uniqueMax: 0,
    rareMax: 15,
    exaltedMax: 3,
    sameFaction: true,
    allowBanned: false,
    allowSuspended: false,
    badgeTone: 'blue',
  },
  {
    value: 'singleton',
    label: 'Singleton',
    description: $localize`:@@format.singleton.description:59 à 79 cartes · 1 exemplaire par carte · 3 à 5 uniques selon le héros`,
    short: $localize`:@@format.singleton.short:59 à 79 cartes · 1 ex. par carte`,
    bga: 'unavailable',
    min: 59,
    max: 79,
    copyMax: 1,
    nameCopyMax: 3,
    nameRarityCopyMax: 1,
    uniqueCopyMax: 1,
    uniqueMax: 3,
    heroUniqueLimits: SINGLETON_HERO_UNIQUES,
    rareMax: null,
    exaltedMax: null,
    sameFaction: true,
    allowBanned: false,
    allowSuspended: false,
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
    nameCopyMax: 3,
    nameRarityCopyMax: 1,
    uniqueCopyMax: 1,
    uniqueMax: 0,
    rareMax: null,
    exaltedMax: null,
    sameFaction: true,
    allowBanned: false,
    allowSuspended: false,
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
    nameCopyMax: null,
    nameRarityCopyMax: null,
    uniqueCopyMax: null,
    uniqueMax: null,
    rareMax: null,
    exaltedMax: null,
    sameFaction: false,
    allowBanned: true,
    allowSuspended: true,
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
